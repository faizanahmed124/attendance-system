import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import { listShiftAssignments, updateShiftAssignment, listShiftTypes } from '../../api/attendanceApi'
import { listEmployees } from '../../api/employeeApi'

export default function ShiftAssignments() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [shiftTypes, setShiftTypes] = useState([])
  const [shiftFilter, setShiftFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    const params = {}
    if (shiftFilter) params.shift_type_id = shiftFilter

    Promise.all([listShiftAssignments(params), listEmployees(), listShiftTypes()])
      .then(([asgRes, empRes, shiftRes]) => {
        setAssignments(asgRes.data)
        setEmployees(empRes.data)
        setShiftTypes(shiftRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [shiftFilter])

  const employeeLabel = (id) => {
    const emp = employees.find((e) => e.id === id)
    return emp ? `${emp.employee_code} — ${emp.full_name}` : `#${id}`
  }
  const shiftName = (id) => shiftTypes.find((s) => s.id === id)?.name || `#${id}`

  const handleEnd = async (assignment) => {
    try {
      await updateShiftAssignment(assignment.id, { status: 'Inactive', end_date: new Date().toISOString().slice(0, 10) })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not end assignment')
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => employeeLabel(r.employee_id) },
    { key: 'shift_type_id', label: 'Shift', render: (r) => shiftName(r.shift_type_id) },
    { key: 'start_date', label: 'Start', render: (r) => <span className="mono">{r.start_date}</span> },
    { key: 'end_date', label: 'End', render: (r) => <span className="mono">{r.end_date || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status === 'Active' ? 'active' : 'inactive'} /> },
    {
      key: 'actions', label: '',
      render: (r) => r.status === 'Active' ? (
        <button className="btn btn-outline btn-sm" onClick={() => handleEnd(r)}>End Assignment</button>
      ) : null,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/attendance/shift-types')}>
            ← Back to shift types
          </button>
          <h1>Shift Assignments</h1>
          <p>Which employees are on which shift, and since when.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="toolbar">
        <div className="filter-bar">
          <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="">All shifts</option>
            {shiftTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="card card-pad">Loading…</div> : <DataTable columns={columns} data={assignments} emptyMessage="No shift assignments yet" />}
    </div>
  )
}
