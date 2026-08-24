import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import { listLeaveApplications, listLeaveTypes } from '../../api/leaveApi'
import { listEmployees } from '../../api/employeeApi'

export default function LeaveApplications() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [employees, setEmployees] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listLeaveApplications(), listEmployees(), listLeaveTypes()])
      .then(([appRes, empRes, typeRes]) => {
        setApplications(appRes.data)
        setEmployees(empRes.data)
        setLeaveTypes(typeRes.data)
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load applications'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const empName = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`
  const typeName = (id) => leaveTypes.find((t) => t.id === id)?.name || `#${id}`

  const statusPillType = (status) => {
    if (status === 'Approved') return 'active'
    if (status === 'Rejected') return 'inactive'
    return 'Pending'
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => empName(r.employee_id) },
    { key: 'leave_type_id', label: 'Leave Type', render: (r) => typeName(r.leave_type_id) },
    { key: 'from_date', label: 'From', render: (r) => <span className="mono">{r.from_date}</span> },
    { key: 'to_date', label: 'To', render: (r) => <span className="mono">{r.to_date}</span> },
    { key: 'total_leave_days', label: 'Days', render: (r) => <span className="mono">{r.total_leave_days}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={statusPillType(r.status)} /> },
    {
      key: 'actions', label: '',
      render: () => <span style={{ color: 'var(--primary)', fontSize: 12.5, fontWeight: 600 }}>View →</span>,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leave Applications</h1>
          <p>Employee time-off requests - approve or reject against their leave balance.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/leaves/applications/new')}>
          + New Application
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={applications}
          emptyMessage="No leave applications yet"
          onRowClick={(row) => navigate(`/leaves/applications/${row.id}`)}
        />
      )}
    </div>
  )
}
