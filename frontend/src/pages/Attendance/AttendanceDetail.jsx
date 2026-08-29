import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusPill from '../../components/StatusPill'
import { getAttendance, updateAttendance, deleteAttendance } from '../../api/attendanceApi'
import { listShiftTypes } from '../../api/attendanceApi'
import { getEmployee } from '../../api/employeeApi'

const STATUS_OPTIONS = ['Present', 'Absent', 'On Leave', 'Half Day', 'Work From Home']

export default function AttendanceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [record, setRecord] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [shiftTypes, setShiftTypes] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    getAttendance(id)
      .then((res) => {
        setRecord(res.data)
        setForm({
          status: res.data.status,
          shift_type_id: res.data.shift_type_id || '',
          check_in_time: toLocalInput(res.data.check_in_time),
          check_out_time: toLocalInput(res.data.check_out_time),
        })
        return getEmployee(res.data.employee_id)
      })
      .then((empRes) => setEmployee(empRes.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load this record'))
      .finally(() => setLoading(false))

    listShiftTypes().then((res) => setShiftTypes(res.data))
  }

  useEffect(load, [id])

  function toLocalInput(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        status: form.status,
        shift_type_id: form.shift_type_id ? Number(form.shift_type_id) : null,
        check_in_time: form.check_in_time ? new Date(form.check_in_time).toISOString() : null,
        check_out_time: form.check_out_time ? new Date(form.check_out_time).toISOString() : null,
      }
      const res = await updateAttendance(id, payload)
      setRecord(res.data)
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'You may not have permission to edit this record')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setError('')
    try {
      await deleteAttendance(id)
      navigate('/attendance')
    } catch (err) {
      setError(err.response?.data?.detail || 'You may not have permission to delete this record')
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !record) return <div className="error-banner">{error}</div>
  if (!record) return null

  // Compare loosely-numerically, not strictly (===) - a string vs number
  // ID mismatch would otherwise silently never match, always showing "—"
  // even when a valid shift_type_id is present on the record.
  const shift = record.shift_type_id != null
    ? shiftTypes.find((s) => Number(s.id) === Number(record.shift_type_id))
    : null
  const shiftLabel = shift?.name || (record.shift_type_id ? `#${record.shift_type_id} (not found)` : 'No shift assigned')

  const initials = employee ? employee.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/attendance')}>
            ← Back to list
          </button>
          <h1>Attendance · #{record.id}</h1>
          <p>
            {employee ? `${employee.employee_code} — ${employee.full_name}` : `Employee #${record.employee_id}`}
            {' · '}
            <span className="mono">{record.attendance_date}</span>
          </p>
        </div>
        {!editing && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="profile-layout">
        <div className="profile-photo-card">
          <div className="photo-frame">{initials}</div>
          <div className="profile-name">{employee ? employee.full_name : `Employee #${record.employee_id}`}</div>
          <div className="profile-code">{employee ? employee.employee_code : ''}</div>
          <div style={{ marginTop: 10 }}><StatusPill status={record.status} /></div>

          <div className="profile-meta">
            <div className="row"><span>Date</span><span className="mono">{record.attendance_date}</span></div>
            <div className="row"><span>Shift</span><span>{shiftLabel}</span></div>
            <div className="row"><span>Working hours</span><span className="mono">{record.working_hours ?? '—'}</span></div>
            {employee?.allow_overtime && (
              <div className="row"><span>Overtime hours</span><span className="mono" style={{ color: record.overtime_hours > 0 ? 'var(--primary)' : undefined, fontWeight: record.overtime_hours > 0 ? 700 : undefined }}>{record.overtime_hours ?? 0}</span></div>
            )}
            <div className="row"><span>Late entry</span><span>{record.late_entry ? 'Yes' : 'No'}</span></div>
            <div className="row"><span>Early exit</span><span>{record.early_exit ? 'Yes' : 'No'}</span></div>
          </div>

          {employee && (
            <button className="btn btn-outline btn-sm full-width" style={{ marginTop: 16 }} onClick={() => navigate(`/employees/${employee.id}`)}>
              View Employee Profile →
            </button>
          )}
        </div>

        <div>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Check-in / Check-out</div>
            <div className="form-section-body">
              {!editing ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <DetailRow label="Check-in" value={<span className="mono">{record.check_in_time ? new Date(record.check_in_time).toLocaleString() : '—'}</span>} />
                  <DetailRow label="Check-out" value={<span className="mono">{record.check_out_time ? new Date(record.check_out_time).toLocaleString() : '—'}</span>} />
                  <DetailRow label="Working hours" value={<span className="mono">{record.working_hours ?? '—'}</span>} />
                  {employee?.allow_overtime && (
                    <DetailRow label="Overtime hours" value={<span className="mono">{record.overtime_hours ?? 0}</span>} />
                  )}
                </div>
              ) : (
                <div className="form-grid">
                  <div className="field">
                    <label>Check-in time</label>
                    <input type="datetime-local" value={form.check_in_time} onChange={(e) => setForm({ ...form, check_in_time: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Check-out time</label>
                    <input type="datetime-local" value={form.check_out_time} onChange={(e) => setForm({ ...form, check_out_time: e.target.value })} />
                  </div>
                </div>
              )}
              {!employee?.allow_overtime && (
                <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 10 }}>
                  This employee doesn't have "Allow Overtime" enabled on their profile, so hours beyond their shift's scheduled duration aren't credited.
                </p>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">2</span> Status &amp; Shift</div>
            <div className="form-section-body">
              {!editing ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <DetailRow label="Status" value={<StatusPill status={record.status} />} />
                  <DetailRow label="Shift" value={shiftLabel} />
                  <DetailRow label="Late entry" value={record.late_entry ? 'Yes' : 'No'} />
                  <DetailRow label="Early exit" value={record.early_exit ? 'Yes' : 'No'} />
                </div>
              ) : (
                <div className="form-grid">
                  <div className="field">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Shift type</label>
                    <select value={form.shift_type_id} onChange={(e) => setForm({ ...form, shift_type_id: e.target.value })}>
                      <option value="">— None —</option>
                      {shiftTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {editing && (
            <div className="sticky-actions">
              <button className="btn btn-outline" onClick={() => { setEditing(false); load() }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Delete this record?</h3></div>
            <div className="modal-body">This attendance entry will be permanently removed. This can't be undone.</div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Deleting…' : 'Delete record'}
              </button>
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
