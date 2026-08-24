import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTicket } from '../../api/helpdeskApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const CATEGORIES = ['IT', 'HR', 'Payroll', 'Facilities', 'Other']
const emptyForm = { raised_by: '', subject: '', description: '', category: 'IT', priority: 'Medium' }

export default function TicketForm() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listEmployees().then((res) => setEmployees(res.data)).finally(() => setLoading(false))
  }, [])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await createTicket({ ...form, raised_by: Number(form.raised_by) })
      navigate(`/helpdesk/tickets/${res.data.id}`)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create ticket'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/helpdesk/tickets')}>
            ← Back to tickets
          </button>
          <h1>New Ticket</h1>
          <p>Describe the issue - support staff will pick it up.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section-body">
            <div className="field">
              <label>Raised By</label>
              <select value={form.raised_by} onChange={set('raised_by')} required>
                <option value="">— Select employee —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Subject</label>
              <input value={form.subject} onChange={set('subject')} required autoFocus />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={set('category')}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Priority</label>
                <select value={form.priority} onChange={set('priority')}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={5}
                required
                style={{ width: '100%', padding: 9, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
              />
            </div>
          </div>
        </div>

        <div className="sticky-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/helpdesk/tickets')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
