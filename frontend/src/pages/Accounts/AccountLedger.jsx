import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAccountLedger } from '../../api/accountsApi'

export default function AccountLedger() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ledger, setLedger] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    getAccountLedger(id)
      .then((res) => setLedger(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load ledger'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error) return <div className="error-banner">{error}</div>
  if (!ledger) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/accounts/chart-of-accounts')}>
            ← Back to Chart of Accounts
          </button>
          <h1>{ledger.account_name}</h1>
          <p>All journal lines posted against this account.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="label">Total Debit</div>
          <div className="value mono">{ledger.total_debit.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Credit</div>
          <div className="value mono">{ledger.total_credit.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="label">Balance</div>
          <div className={`value mono ${ledger.balance >= 0 ? 'value-success' : 'value-danger'}`}>{ledger.balance.toLocaleString()}</div>
        </div>
      </div>

      {ledger.lines.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">□</div>
            <div className="title">No transactions yet</div>
            <div>Journal entries, expense claims, or salary postings against this account will show here.</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Remarks</th>
                <th>Debit</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              {ledger.lines.map((line, i) => (
                <tr key={i}>
                  <td className="mono">{line.entry_date}</td>
                  <td>{line.reference_number || '—'}</td>
                  <td>{line.remarks || '—'}</td>
                  <td className="mono">{line.debit ? line.debit.toLocaleString() : '—'}</td>
                  <td className="mono">{line.credit ? line.credit.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
