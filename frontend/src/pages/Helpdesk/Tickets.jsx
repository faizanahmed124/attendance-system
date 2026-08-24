import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import { listTickets } from '../../api/helpdeskApi'
import { listEmployees } from '../../api/employeeApi'

export default function Tickets() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const load = () => {
    setLoading(true)
    const params = statusFilter ? { status: statusFilter } : {}
    Promise.all([listTickets(params), listEmployees()])
      .then(([tRes, eRes]) => { setTickets(tRes.data); setEmployees(eRes.data) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const empName = (id) => id ? (employees.find((e) => e.id === id)?.full_name || `#${id}`) : '—'

  const statusPillType = (status) => {
    if (status === 'Resolved' || status === 'Closed') return 'active'
    if (status === 'Replied') return 'Pending'
    return 'inactive'
  }
  const priorityColor = (p) => ({ Low: 'var(--ink-faint)', Medium: 'var(--primary)', High: '#C6720D', Urgent: 'var(--danger)' }[p] || 'var(--ink-faint)')

  const columns = [
    { key: 'subject', label: 'Subject' },
    { key: 'category', label: 'Category', render: (r) => r.category || '—' },
    { key: 'raised_by', label: 'Raised By', render: (r) => empName(r.raised_by) },
    { key: 'assigned_to', label: 'Assigned To', render: (r) => empName(r.assigned_to) },
    { key: 'priority', label: 'Priority', render: (r) => <span style={{ fontSize: 12, fontWeight: 700, color: priorityColor(r.priority) }}>{r.priority}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={statusPillType(r.status)} /> },
    { key: 'created_at', label: 'Created', render: (r) => <span className="mono" style={{ fontSize: 11.5 }}>{new Date(r.created_at).toLocaleDateString()}</span> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Help Desk</h1>
          <p>Support tickets - IT, HR, Payroll, or anything else employees need help with.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/helpdesk/tickets/new')}>
          + New Ticket
        </button>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Open">Open</option>
            <option value="Replied">Replied</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={tickets} emptyMessage="No tickets yet" onRowClick={(r) => navigate(`/helpdesk/tickets/${r.id}`)} />
      )}
    </div>
  )
}
