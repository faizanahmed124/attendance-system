import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusPill from '../../components/StatusPill'
import { getTicket, updateTicket, addComment, deleteTicket } from '../../api/helpdeskApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const CATEGORIES = ['IT', 'HR', 'Payroll', 'Facilities', 'Other']

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [commentText, setCommentText] = useState('')
  const [commentAs, setCommentAs] = useState('')
  const [posting, setPosting] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getTicket(id), listEmployees()])
      .then(([tRes, eRes]) => {
        setTicket(tRes.data)
        setEmployees(eRes.data)
        setCommentAs((prev) => prev || String(tRes.data.raised_by))
      })
      .catch((err) => setError(extractErrorMessage(err, 'Could not load ticket')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const empName = (empId) => empId ? (employees.find((e) => e.id === empId)?.full_name || `#${empId}`) : '—'

  const handleFieldChange = async (field, value) => {
    setError('')
    try {
      await updateTicket(id, { [field]: value })
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update ticket'))
    }
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !commentAs) return
    setPosting(true)
    setError('')
    try {
      await addComment(id, { employee_id: Number(commentAs), message: commentText.trim() })
      setCommentText('')
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not post comment'))
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this ticket?')) return
    try {
      await deleteTicket(id)
      navigate('/helpdesk/tickets')
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete ticket'))
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !ticket) return <div className="error-banner">{error}</div>
  if (!ticket) return null

  const statusPillType = (status) => {
    if (status === 'Resolved' || status === 'Closed') return 'active'
    if (status === 'Replied') return 'Pending'
    return 'inactive'
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/helpdesk/tickets')}>
            ← Back to tickets
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            #{ticket.id} — {ticket.subject}
            <span style={{ fontSize: 12 }}><StatusPill status={statusPillType(ticket.status)} /></span>
          </h1>
          <p>Raised by {empName(ticket.raised_by)} · {new Date(ticket.created_at).toLocaleString()}</p>
        </div>
        <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-section">
        <div className="form-section-header"><span className="num">1</span> Details</div>
        <div className="form-section-body">
          <p style={{ fontSize: 13.5, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
          <div className="form-grid">
            <div className="field">
              <label>Status</label>
              <select value={ticket.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
                <option value="Open">Open</option>
                <option value="Replied">Replied</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select value={ticket.priority} onChange={(e) => handleFieldChange('priority', e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Category</label>
              <select value={ticket.category || ''} onChange={(e) => handleFieldChange('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Assigned To</label>
              <select value={ticket.assigned_to || ''} onChange={(e) => handleFieldChange('assigned_to', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— Unassigned —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">2</span> Conversation ({ticket.comments.length})</div>
        <div className="form-section-body">
          {ticket.comments.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 16 }}>No replies yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {ticket.comments.map((c) => (
                <div key={c.id} style={{ padding: '10px 12px', borderRadius: 8, background: c.employee_id === ticket.raised_by ? 'var(--surface-soft)' : 'var(--primary-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 12.5 }}>{empName(c.employee_id)}</strong>
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>{c.message}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handlePostComment}>
            <div className="form-grid">
              <div className="field">
                <label>Reply as</label>
                <select value={commentAs} onChange={(e) => setCommentAs(e.target.value)}>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                placeholder="Write a reply…"
                style={{ width: '100%', padding: 9, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={posting || !commentText.trim()}>
              {posting ? 'Posting…' : 'Post Reply'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
