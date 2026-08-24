import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLeaveApplication, listLeaveTypes, getLeaveBalance } from '../../api/leaveApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const emptyForm = { employee_id: '', leave_type_id: '', from_date: '', to_date: '', half_day: false, reason: '' }

export default function LeaveApplicationForm() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listEmployees(), listLeaveTypes()])
      .then(([empRes, typeRes]) => {
        setEmployees(empRes.data)
        setLeaveTypes(typeRes.data.filter((t) => t.is_active))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!form.employee_id) { setBalance(null); return }
    getLeaveBalance(form.employee_id).then((res) => setBalance(res.data)).catch(() => setBalance(null))
  }, [form.employee_id])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const selectedType = leaveTypes.find((t) => t.id === Number(form.leave_type_id))
  const balanceForType = balance?.find((b) => b.leave_type_id === Number(form.leave_type_id))

  const requestedDays = (() => {
    if (form.half_day) return 0.5
    if (!form.from_date || !form.to_date) return 0
    const from = new Date(form.from_date)
    const to = new Date(form.to_date)
    const diff = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await createLeaveApplication({
        ...form,
        employee_id: Number(form.employee_id),
        leave_type_id: Number(form.leave_type_id),
      })
      navigate(`/leaves/applications/${res.data.id}`)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not submit application'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/leaves/applications')}>
            ← Back to applications
          </button>
          <h1>New Leave Application</h1>
          <p>Request time off - checked automatically against the employee's leave balance.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {employees.length === 0 || leaveTypes.length === 0 ? (
        <div className="error-banner">{leaveTypes.length === 0 ? 'Create a Leave Type first.' : 'No employees found.'}</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Request Details</div>
            <div className="form-section-body">
              <div className="form-grid">
                <div className="field">
                  <label>Employee</label>
                  <select value={form.employee_id} onChange={set('employee_id')} required>
                    <option value="">— Select —</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Leave Type</label>
                  <select value={form.leave_type_id} onChange={set('leave_type_id')} required>
                    <option value="">— Select —</option>
                    {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_lwp ? ' (Without Pay)' : ''}</option>)}
                  </select>
                </div>
              </div>

              {form.employee_id && form.leave_type_id && !selectedType?.is_lwp && (
                <div style={{
                  background: balanceForType && balanceForType.balance < requestedDays ? 'var(--danger-soft)' : 'var(--primary-soft)',
                  color: balanceForType && balanceForType.balance < requestedDays ? 'var(--danger)' : 'var(--primary)',
                  borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
                }}>
                  Available balance: <strong>{balanceForType ? balanceForType.balance : 0} day(s)</strong>
                  {requestedDays > 0 && ` · Requesting: ${requestedDays} day(s)`}
                  {balanceForType && balanceForType.balance < requestedDays && ' — insufficient balance!'}
                </div>
              )}

              <div className="form-grid">
                <div className="field">
                  <label>From Date</label>
                  <input type="date" value={form.from_date} onChange={set('from_date')} required />
                </div>
                <div className="field">
                  <label>To Date</label>
                  <input type="date" value={form.to_date} onChange={set('to_date')} required disabled={form.half_day} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                <input
                  type="checkbox"
                  checked={form.half_day}
                  onChange={(e) => setForm({ ...form, half_day: e.target.checked, to_date: e.target.checked ? form.from_date : form.to_date })}
                />
                Half day
              </label>

              <div className="field">
                <label>Reason</label>
                <textarea
                  value={form.reason}
                  onChange={set('reason')}
                  rows={3}
                  style={{ width: '100%', padding: 9, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
                />
              </div>
            </div>
          </div>

          <div className="sticky-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/leaves/applications')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
