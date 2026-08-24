import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusPill from '../../components/StatusPill'
import { getLeaveApplication, updateLeaveApplication, deleteLeaveApplication, listLeaveTypes, getLeaveBalance } from '../../api/leaveApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

export default function LeaveApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [leaveType, setLeaveType] = useState(null)
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    getLeaveApplication(id)
      .then(async (res) => {
        setApplication(res.data)
        try {
          const [empRes, typeRes, balRes] = await Promise.all([
            listEmployees(), listLeaveTypes(), getLeaveBalance(res.data.employee_id),
          ])
          setEmployee(empRes.data.find((e) => e.id === res.data.employee_id))
          setLeaveType(typeRes.data.find((t) => t.id === res.data.leave_type_id))
          setBalance(balRes.data.find((b) => b.leave_type_id === res.data.leave_type_id))
        } catch (innerErr) {
          console.error('Could not load related details:', innerErr)
        }
      })
      .catch((err) => setError(extractErrorMessage(err, 'Could not load application')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleStatusChange = async (status) => {
    setError('')
    try {
      const res = await updateLeaveApplication(id, { status })
      setApplication(res.data)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update status'))
    }
  }

  const handleDelete = async () => {
    try {
      await deleteLeaveApplication(id)
      navigate('/leaves/applications')
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete application'))
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !application) return <div className="error-banner">{error}</div>
  if (!application) return null

  const statusPillType = (status) => {
    if (status === 'Approved') return 'active'
    if (status === 'Rejected') return 'inactive'
    return 'Pending'
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/leaves/applications')}>
            ← Back to applications
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Leave Application · #{application.id}
            <span style={{ fontSize: 12 }}><StatusPill status={statusPillType(application.status)} /></span>
          </h1>
          <p>{employee ? `${employee.employee_code} — ${employee.full_name}` : `Employee #${application.employee_id}`} · {leaveType?.name || ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {application.status === 'Open' && (
            <>
              <button className="btn btn-primary" onClick={() => handleStatusChange('Approved')}>Approve</button>
              <button className="btn btn-danger" onClick={() => handleStatusChange('Rejected')}>Reject</button>
            </>
          )}
          {application.status !== 'Open' && (
            <button className="btn btn-outline" onClick={() => handleStatusChange('Open')}>Reset to Open</button>
          )}
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-section">
        <div className="form-section-header"><span className="num">1</span> Leave Details</div>
        <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
          <DetailRow label="From" value={<span className="mono">{application.from_date}</span>} />
          <DetailRow label="To" value={<span className="mono">{application.to_date}</span>} />
          <DetailRow label="Half Day" value={application.half_day ? 'Yes' : 'No'} />
          <DetailRow label="Total Days" value={<span className="mono">{application.total_leave_days}</span>} />
          <DetailRow label="Applied On" value={<span className="mono">{application.posting_date}</span>} />
          {balance && !leaveType?.is_lwp && (
            <DetailRow label="Employee's Balance (this leave type)" value={<span className="mono">{balance.balance} day(s)</span>} />
          )}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">2</span> Reason</div>
        <div className="form-section-body">
          <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{application.reason || '— No reason given —'}</p>
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Delete this application?</h3></div>
            <div className="modal-body">This can't be undone.</div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13.5 }}>{value}</span>
    </div>
  )
}
