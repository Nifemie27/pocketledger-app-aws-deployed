# PocketLedger — AWS Cloud Internship Project


**React (S3) → Express API (EC2 + Auto Scaling) → MySQL (RDS)**

---

## Project Structure

```
pocketledger/
├── frontend/    React app (Vite) — deploy to S3
└── backend/     Express API      — deploy to EC2
```

---

## Local Development

### 1. Start the backend

```bash
cd backend
cp .env.example .env
# Fill in your RDS endpoint and credentials in .env
npm install
npm start
# API running at http://localhost:4000
```

### 2. Start the frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:4000 (default for local dev)
npm install
npm run dev
# App running at http://localhost:5173
```

### 3. Test the API directly

```bash
# Health check
curl http://localhost:4000/health

# Add an income transaction
curl -X POST http://localhost:4000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"income","amount":5000,"description":"Fabric sales"}'

# Get all transactions
curl http://localhost:4000/api/transactions

# Get summary
curl http://localhost:4000/api/summary
```

---

## AWS Deployment

### Frontend → S3

```bash
cd frontend

# Set the production API URL
echo "VITE_API_URL=http://YOUR-LOAD-BALANCER-DNS" > .env

# Build
npm run build

# Upload the dist/ folder to your S3 bucket
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Enable static website hosting on the bucket (see solution guide)
```

### Backend → EC2 (via Auto Scaling Group)

The EC2 Launch Template user data script installs Node.js and starts
the backend automatically. Set these environment variables on the instance:

```bash
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=yourpassword
DB_NAME=pocketledger
PORT=4000
```

See the solution guide for the complete Launch Template user data script.

---

## API Endpoints

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| GET    | /health                   | Health check (used by Load Balancer) |
| GET    | /api/transactions         | Get all transactions (newest first) |
| POST   | /api/transactions         | Add a new transaction               |
| DELETE | /api/transactions/:id     | Delete a transaction                |
| GET    | /api/summary              | Get income, expense, balance totals |

### POST /api/transactions — Request Body

```json
{
  "type": "income",
  "amount": 5000,
  "description": "Fabric sales — 10 yards"
}
```

`type` must be `"income"` or `"expense"`.
`amount` must be a positive number.

---

## Database

The backend creates the `transactions` table automatically on first start.
All you need is an empty MySQL database called `pocketledger` on RDS.

```sql
-- The backend runs this automatically:
CREATE TABLE IF NOT EXISTS transactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  type        ENUM('income', 'expense') NOT NULL,
  amount      DECIMAL(12, 2)           NOT NULL,
  description VARCHAR(255)             NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
# pocketledger-app
