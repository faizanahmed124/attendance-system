import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import { listLoans } from '../../api/loanApi'
import { listEmployees } from '../../api/employeeApi'
import { listLoanTypes } from '../../api/loanApi'

export default function Loans() {
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [employees, setEmployees] = useState([])
  const [loanTypes, setLoanTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const load = () => {
    setLoading(true)
    const params = statusFilter ? { status: statusFilter } : {}
    Promise.all([listLoans(params), listEmployees(), listLoanTypes()])
      .then(([loanRes, empRes, typeRes]) => {
        setLoans(loanRes.data)
        setEmployees(empRes.data)
        setLoanTypes(typeRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const empName = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`
  const typeName = (id) => loanTypes.find((t) => t.id === id)?.name || `#${id}`

  const statusPillType = (status) => {
    if (status === 'Repaid') return 'active'
    if (status === 'Sanctioned') return 'Pending'
    return 'Present' // Disbursed
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => empName(r.employee_id) },
    { key: 'loan_type_id', label: 'Loan Type', render: (r) => typeName(r.loan_type_id) },
    { key: 'loan_amount', label: 'Principal', render: (r) => <span className="mono">{r.loan_amount.toLocaleString()}</span> },
    { key: 'monthly_repayment_amount', label: 'EMI', render: (r) => <span className="mono">{r.monthly_repayment_amount.toLocaleString()}</span> },
    { key: 'balance_amount', label: 'Balance', render: (r) => <span className="mono">{r.balance_amount.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={statusPillType(r.status)} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Loans</h1>
          <p>Every sanctioned loan - disbursement status, EMI, and outstanding balance.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Sanctioned">Sanctioned (not yet disbursed)</option>
            <option value="Disbursed">Disbursed</option>
            <option value="Repaid">Repaid</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={loans}
          emptyMessage="No loans yet - approve a Loan Application and convert it, or create one directly"
          onRowClick={(row) => navigate(`/loans/${row.id}`)}
        />
      )}
    </div>
  )
}
