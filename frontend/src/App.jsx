import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://pocketledger-lb-1333310688.eu-north-1.elb.amazonaws.com'

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary]           = useState({ total_income: 0, total_expenses: 0, balance: 0 })
  const [form, setForm]                 = useState({ type: 'income', amount: '', description: '' })
  const [loading, setLoading]           = useState(true)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')

  const fetchData = async () => {
    try {
      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions`),
        fetch(`${API_URL}/api/summary`)
      ])
      const txData  = await txRes.json()
      const sumData = await sumRes.json()
      setTransactions(txData)
      setSummary(sumData)
    } catch {
      setError('Could not connect to the server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.amount || !form.description.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          type       : form.type,
          amount     : parseFloat(form.amount),
          description: form.description.trim()
        })
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save transaction.')
      } else {
        setSuccess('Transaction saved!')
        setForm({ type: 'income', amount: '', description: '' })
        fetchData()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch {
      setError('Failed to save. Check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    try {
      await fetch(`${API_URL}/api/transactions/${id}`, { method: 'DELETE' })
      fetchData()
    } catch {
      setError('Failed to delete.')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1 className="logo">PocketLedger</h1>
          <p className="tagline">Track your money. Grow your business.</p>
        </div>
      </header>

      <main className="main">
        <section className="summary-grid">
          <div className="card card-income">
            <p className="card-label">Total Income</p>
            <p className="card-value">{formatNaira(summary.total_income)}</p>
          </div>
          <div className="card card-expense">
            <p className="card-label">Total Expenses</p>
            <p className="card-value">{formatNaira(summary.total_expenses)}</p>
          </div>
          <div className={`card card-balance ${Number(summary.balance) >= 0 ? 'positive' : 'negative'}`}>
            <p className="card-label">Balance</p>
            <p className="card-value">{formatNaira(summary.balance)}</p>
          </div>
        </section>

        <section className="form-section">
          <h2 className="section-title">Add Transaction</h2>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₦)</label>
                <input type="number" min="1" step="0.01" placeholder="e.g. 5000"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" placeholder="e.g. Fabric sales — 10 yards"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            {error   && <p className="msg msg-error">{error}</p>}
            {success && <p className="msg msg-success">{success}</p>}
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Transaction'}
            </button>
          </form>
        </section>

        <section className="list-section">
          <h2 className="section-title">Transaction History</h2>
          {loading ? (
            <p className="empty-msg">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="empty-msg">No transactions yet. Add your first one above.</p>
          ) : (
            <ul className="tx-list">
              {transactions.map(tx => (
                <li key={tx.id} className={`tx-item ${tx.type}`}>
                  <div className="tx-left">
                    <span className={`tx-badge ${tx.type}`}>
                      {tx.type === 'income' ? '↑ Income' : '↓ Expense'}
                    </span>
                    <span className="tx-desc">{tx.description}</span>
                    <span className="tx-date">{formatDate(tx.created_at)}</span>
                  </div>
                  <div className="tx-right">
                    <span className={`tx-amount ${tx.type}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatNaira(tx.amount)}
                    </span>
                    <button className="btn-delete" onClick={() => handleDelete(tx.id)}>✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>PocketLedger — Built on AWS | S3 + EC2 + RDS</p>
      </footer>
    </div>
  )
}
