import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import { listLoanApplications, listLoanTypes } from '../../api/loanApi'
import { listEmployees } from '../../api/employeeApi'

export default function LoanApplications() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [employees, setEmployees] = useState([])
  const [loanTypes, setLoanTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listLoanApplications(), listEmployees(), listLoanTypes()])
      .then(([appRes, empRes, typeRes]) => {
        setApplications(appRes.data)
        setEmployees(empRes.data)
        setLoanTypes(typeRes.data)
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load applications'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const empName = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`
  const typeName = (id) => loanTypes.find((t) => t.id === id)?.name || `#${id}`

  const statusPillType = (status) => {
    if (status === 'Approved') return 'active'
    if (status === 'Rejected') return 'inactive'
    return 'Pending'
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => empName(r.employee_id) },
    { key: 'loan_type_id', label: 'Loan Type', render: (r) => typeName(r.loan_type_id) },
    { key: 'loan_amount', label: 'Amount Requested', render: (r) => <span className="mono">{r.loan_amount.toLocaleString()}</span> },
    { key: 'repayment_periods', label: 'Term', render: (r) => `${r.repayment_periods} mo` },
    { key: 'application_date', label: 'Applied On', render: (r) => <span className="mono">{r.application_date}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={statusPillType(r.status)} /> },
    {
      key: 'actions', label: '',
      render: (r) => <span style={{ color: 'var(--primary)', fontSize: 12.5, fontWeight: 600 }}>View →</span>,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Loan Applications</h1>
          <p>Employee requests for a loan - approve or reject, then convert approved ones into an active Loan.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/loans/applications/new')}>
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
          emptyMessage="No loan applications yet"
          onRowClick={(row) => navigate(`/loans/applications/${row.id}`)}
        />
      )}
    </div>
  )
}
