import { useEffect, useState } from 'react'
import { getLeaveBalance } from '../../api/leaveApi'
import { listEmployees } from '../../api/employeeApi'

export default function LeaveBalance() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [balance, setBalance] = useState([])
  const [loading, setLoading] = useState(true)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listEmployees().then((res) => {
      setEmployees(res.data)
      if (res.data.length) setEmployeeId(res.data[0].id)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!employeeId) return
    setBalanceLoading(true)
    setError('')
    getLeaveBalance(employeeId)
      .then((res) => setBalance(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load balance'))
      .finally(() => setBalanceLoading(false))
  }, [employeeId])

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Employee Leave Balance</h1>
          <p>Allocated, carried forward, taken, and remaining leave days per employee.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {balanceLoading ? (
        <div className="card card-pad">Loading…</div>
      ) : balance.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">□</div><div className="title">No allocations or leave history for this employee yet</div></div></div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Allocated</th>
                <th>Carry Forwarded</th>
                <th>Taken (Approved)</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {balance.map((b) => (
                <tr key={b.leave_type_id}>
                  <td style={{ fontWeight: 600 }}>{b.leave_type_name}</td>
                  <td className="mono">{b.allocated}</td>
                  <td className="mono">{b.carry_forwarded}</td>
                  <td className="mono">{b.taken}</td>
                  <td className="mono" style={{ fontWeight: 700, color: b.balance < 0 ? 'var(--danger)' : 'var(--success)' }}>{b.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
