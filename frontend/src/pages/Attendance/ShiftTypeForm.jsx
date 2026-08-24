import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import {
  getShiftType, createShiftType, updateShiftType, deleteShiftType,
  bulkCreateShiftAssignments, listShiftAssignments,
} from '../../api/attendanceApi'
import { listEmployees } from '../../api/employeeApi'
import { listHolidayLists } from '../../api/holidayApi'

const CHECK_IN_OUT_OPTIONS = [
  'Alternating entries as IN and OUT during the same shift',
  'Strictly based on Log Type in Employee Checkin',
]
const WORKING_HOURS_OPTIONS = [
  'First Check-in and Last Check-out',
  'Every Valid Check-in and Check-out',
]
const ROSTER_COLORS = ['Blue', 'Green', 'Red', 'Orange', 'Purple', 'Gray']

const emptyForm = {
  name: '', start_time: '09:00:00', end_time: '18:00:00',
  holiday_list_id: '', roster_color: 'Blue', enable_auto_attendance: true,
  determine_check_in_out: CHECK_IN_OUT_OPTIONS[0],
  working_hours_calc_based_on: WORKING_HOURS_OPTIONS[1],
  begin_check_in_before_shift_minutes: 60,
  allow_check_out_after_shift_minutes: 0,
  mark_auto_attendance_on_holidays: false,
  working_hours_threshold_half_day: '',
  working_hours_threshold_absent: '',
  process_attendance_after: '',
  auto_update_last_sync: true,
  enable_late_entry_marking: true,
  late_entry_grace_minutes: 10,
  enable_early_exit_marking: true,
  early_exit_grace_minutes: 10,
}

export default function ShiftTypeForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [holidayLists, setHolidayLists] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [employees, setEmployees] = useState([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [assignForm, setAssignForm] = useState({ start_date: '', end_date: '' })
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignedCount, setAssignedCount] = useState(null)

  useEffect(() => {
    listHolidayLists().then((res) => setHolidayLists(res.data)).catch(() => setHolidayLists([]))

    if (isEdit) {
      getShiftType(id).then((res) => {
        const s = res.data
        setForm({
          name: s.name, start_time: s.start_time, end_time: s.end_time,
          holiday_list_id: s.holiday_list_id || '', roster_color: s.roster_color,
          enable_auto_attendance: s.enable_auto_attendance,
          determine_check_in_out: s.determine_check_in_out,
          working_hours_calc_based_on: s.working_hours_calc_based_on,
          begin_check_in_before_shift_minutes: s.begin_check_in_before_shift_minutes,
          allow_check_out_after_shift_minutes: s.allow_check_out_after_shift_minutes,
          mark_auto_attendance_on_holidays: s.mark_auto_attendance_on_holidays,
          working_hours_threshold_half_day: s.working_hours_threshold_half_day ?? '',
          working_hours_threshold_absent: s.working_hours_threshold_absent ?? '',
          process_attendance_after: s.process_attendance_after || '',
          auto_update_last_sync: s.auto_update_last_sync,
          enable_late_entry_marking: s.enable_late_entry_marking,
          late_entry_grace_minutes: s.late_entry_grace_minutes,
          enable_early_exit_marking: s.enable_early_exit_marking,
          early_exit_grace_minutes: s.early_exit_grace_minutes,
        })
        setLoading(false)
      }).catch((err) => {
        setError(err.response?.data?.detail || 'Could not load shift type')
        setLoading(false)
      })
    }
  }, [id])

  const buildPayload = () => ({
    ...form,
    holiday_list_id: form.holiday_list_id ? Number(form.holiday_list_id) : null,
    begin_check_in_before_shift_minutes: Number(form.begin_check_in_before_shift_minutes),
    allow_check_out_after_shift_minutes: Number(form.allow_check_out_after_shift_minutes),
    working_hours_threshold_half_day: form.working_hours_threshold_half_day !== '' ? Number(form.working_hours_threshold_half_day) : null,
    working_hours_threshold_absent: form.working_hours_threshold_absent !== '' ? Number(form.working_hours_threshold_absent) : null,
    process_attendance_after: form.process_attendance_after || null,
    late_entry_grace_minutes: Number(form.late_entry_grace_minutes),
    early_exit_grace_minutes: Number(form.early_exit_grace_minutes),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (isEdit) {
        await updateShiftType(id, buildPayload())
        navigate('/attendance/shift-types')
      } else {
        const res = await createShiftType(buildPayload())
        navigate(`/attendance/shift-types/${res.data.id}/edit`)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save shift type')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete shift "${form.name}"?`)) return
    try {
      await deleteShiftType(id)
      navigate('/attendance/shift-types')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete shift type')
    }
  }

  const openAssignModal = async () => {
    setAssignError('')
    setAssignedCount(null)
    setSelectedEmployeeIds([])
    setAssignForm({ start_date: new Date().toISOString().slice(0, 10), end_date: '' })
    if (employees.length === 0) {
      const res = await listEmployees()
      setEmployees(res.data)
    }
    setShowAssignModal(true)
  }

  const toggleEmployee = (empId) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((x) => x !== empId) : [...prev, empId]
    )
  }

  const handleAssign = async () => {
    if (selectedEmployeeIds.length === 0) {
      setAssignError('Select at least one employee')
      return
    }
    setAssigning(true)
    setAssignError('')
    try {
      const res = await bulkCreateShiftAssignments({
        employee_ids: selectedEmployeeIds,
        shift_type_id: Number(id),
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || null,
      })
      setAssignedCount(res.data.length)
      setSelectedEmployeeIds([])
    } catch (err) {
      setAssignError(err.response?.data?.detail || 'Could not assign shift')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/attendance/shift-types')}>
            ← Back to shift types
          </button>
          <h1>{isEdit ? form.name : 'New Shift Type'}</h1>
          <p>Working hours, auto-attendance rules, and grace periods for this shift.</p>
        </div>
        {isEdit && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={openAssignModal}>Assign Employees</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section-header"><span className="num">1</span> Basic</div>
          <div className="form-section-body">
            <div className="form-grid">
              <div className="field">
                <label>Shift name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shift-B" required />
              </div>
              <div className="field">
                <label>Roster color</label>
                <select value={form.roster_color} onChange={(e) => setForm({ ...form, roster_color: e.target.value })}>
                  {ROSTER_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Start time</label>
                <input type="time" step="1" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
              </div>
              <div className="field">
                <label>End time</label>
                <input type="time" step="1" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Holiday list</label>
                <select value={form.holiday_list_id} onChange={(e) => setForm({ ...form, holiday_list_id: e.target.value })}>
                  <option value="">— None —</option>
                  {holidayLists.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 9 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                  <input type="checkbox" checked={form.enable_auto_attendance} onChange={(e) => setForm({ ...form, enable_auto_attendance: e.target.checked })} />
                  Enable Auto Attendance
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header"><span className="num">2</span> Auto Attendance Settings</div>
          <div className="form-section-body">
            <div className="form-grid">
              <div className="field">
                <label>Determine Check-in and Check-out</label>
                <select value={form.determine_check_in_out} onChange={(e) => setForm({ ...form, determine_check_in_out: e.target.value })}>
                  {CHECK_IN_OUT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Working Hours Calculation Based On</label>
                <select value={form.working_hours_calc_based_on} onChange={(e) => setForm({ ...form, working_hours_calc_based_on: e.target.value })}>
                  {WORKING_HOURS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Begin check-in before shift start (minutes)</label>
                <input type="number" value={form.begin_check_in_before_shift_minutes} onChange={(e) => setForm({ ...form, begin_check_in_before_shift_minutes: e.target.value })} />
              </div>
              <div className="field">
                <label>Allow check-out after shift end (minutes)</label>
                <input type="number" value={form.allow_check_out_after_shift_minutes} onChange={(e) => setForm({ ...form, allow_check_out_after_shift_minutes: e.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Working Hours Threshold for Half Day</label>
                <input type="number" step="0.5" value={form.working_hours_threshold_half_day} onChange={(e) => setForm({ ...form, working_hours_threshold_half_day: e.target.value })} placeholder="0 to disable" />
              </div>
              <div className="field">
                <label>Working Hours Threshold for Absent</label>
                <input type="number" step="0.5" value={form.working_hours_threshold_absent} onChange={(e) => setForm({ ...form, working_hours_threshold_absent: e.target.value })} placeholder="0 to disable" />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Process Attendance After</label>
                <input type="date" value={form.process_attendance_after} onChange={(e) => setForm({ ...form, process_attendance_after: e.target.value })} />
              </div>
              <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                  <input type="checkbox" checked={form.mark_auto_attendance_on_holidays} onChange={(e) => setForm({ ...form, mark_auto_attendance_on_holidays: e.target.checked })} />
                  Mark Auto Attendance on Holidays
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                  <input type="checkbox" checked={form.auto_update_last_sync} onChange={(e) => setForm({ ...form, auto_update_last_sync: e.target.checked })} />
                  Automatically update Last Sync of Checkin
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header"><span className="num">3</span> Late Entry &amp; Early Exit Settings</div>
          <div className="form-section-body">
            <div className="form-grid">
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.enable_late_entry_marking} onChange={(e) => setForm({ ...form, enable_late_entry_marking: e.target.checked })} />
                  Enable Late Entry Marking
                </label>
              </div>
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.enable_early_exit_marking} onChange={(e) => setForm({ ...form, enable_early_exit_marking: e.target.checked })} />
                  Enable Early Exit Marking
                </label>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Late Entry Grace Period (minutes)</label>
                <input type="number" value={form.late_entry_grace_minutes} onChange={(e) => setForm({ ...form, late_entry_grace_minutes: e.target.value })} disabled={!form.enable_late_entry_marking} />
              </div>
              <div className="field">
                <label>Early Exit Grace Period (minutes)</label>
                <input type="number" value={form.early_exit_grace_minutes} onChange={(e) => setForm({ ...form, early_exit_grace_minutes: e.target.value })} disabled={!form.enable_early_exit_marking} />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/attendance/shift-types')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create shift type'}
          </button>
        </div>
      </form>

      {showAssignModal && (
        <Modal
          title={`Assign "${form.name}" to Employees`}
          onClose={() => setShowAssignModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={assigning}>
                {assigning ? 'Assigning…' : `Assign to ${selectedEmployeeIds.length} employee(s)`}
              </button>
            </>
          }
        >
          {assignError && <div className="error-banner">{assignError}</div>}
          {assignedCount !== null && (
            <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              Assigned to {assignedCount} employee(s).
            </div>
          )}
          <div className="form-grid">
            <div className="field">
              <label>Start date</label>
              <input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>End date (optional)</label>
              <input type="date" value={assignForm.end_date} onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Select employees</label>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            {employees.map((emp) => (
              <label
                key={emp.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}
              >
                <input type="checkbox" checked={selectedEmployeeIds.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                <span className="mono" style={{ color: 'var(--ink-faint)' }}>{emp.employee_code}</span>
                <span>{emp.full_name}</span>
              </label>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
