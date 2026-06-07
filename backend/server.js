const express = require('express');
const mysql2  = require('mysql2');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ── DB connection ─────────────────────────────────────────────────────────────
const db = mysql2.createConnection({
  host    : process.env.DB_HOST,
  user    : process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port    : process.env.DB_PORT || 3306,
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected to MySQL database.');

  // Create table if it does not exist
  const createTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      type        ENUM('income', 'expense') NOT NULL,
      amount      DECIMAL(12, 2)           NOT NULL,
      description VARCHAR(255)             NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.query(createTable, err => {
    if (err) {
      console.error('Failed to create table:', err.message);
      process.exit(1);
    }
    console.log('Transactions table ready.');
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check — used by the Load Balancer and CloudWatch
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all transactions — newest first
app.get('/api/transactions', (req, res) => {
  db.query('SELECT * FROM transactions ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
    res.json(rows);
  });
});

// POST a new transaction
app.post('/api/transactions', (req, res) => {
  const { type, amount, description } = req.body;

  if (!type || !amount || !description) {
    return res.status(400).json({ error: 'type, amount, and description are required' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'type must be income or expense' });
  }
  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  db.query(
    'INSERT INTO transactions (type, amount, description) VALUES (?, ?, ?)',
    [type, Number(amount), description.trim()],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to save transaction' });
      }
      res.status(201).json({ id: result.insertId, type, amount: Number(amount), description });
    }
  );
});

// DELETE a transaction
app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM transactions WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  });
});

// GET summary — total income, total expenses, balance
app.get('/api/summary', (req, res) => {
  const query = `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS balance
    FROM transactions
  `;
  db.query(query, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch summary' });
    }
    res.json(rows[0]);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PocketLedger API running on port ${PORT}`);
});
