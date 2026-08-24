import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listSalarySlips, createStandaloneSalarySlip } from '../../api/payrollApi'
import { listEmployees } from '../../api/employeeApi'

export default function SalarySlips() {
  const navigate = useNavigate()
  const [slips, setSlips] = useState([])
  const [employees, setEmployees] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ employee_id: '', pay_period_start: '', pay_period_end: '' })

  const load = () => {
    setLoading(true)
    const params = {}
    if (statusFilter) params.status = statusFilter
    Promise.all([listSalarySlips(params), listEmployees()])
      .then(([slipRes, empRes]) => {
        setSlips(slipRes.data)
        setEmployees(empRes.data)
        setForm((f) => ({ ...f, employee_id: f.employee_id || empRes.data[0]?.id || '' }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const employeeLabel = (id) => {
    const emp = employees.find((e) => e.id === id)
    return emp ? `${emp.employee_code} — ${emp.full_name}` : `#${id}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const res = await createStandaloneSalarySlip({ ...form, employee_id: Number(form.employee_id) })
      navigate(`/payroll/salary-slips/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create salary slip')
    } finally {
      setCreating(false)
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => employeeLabel(r.employee_id) },
    { key: 'pay_period_start', label: 'Period', render: (r) => <span className="mono">{r.pay_period_start} → {r.pay_period_end}</span> },
    { key: 'gross_pay', label: 'Gross', render: (r) => <span className="mono">{r.gross_pay.toLocaleString()}</span> },
    { key: 'total_deductions', label: 'Deductions', render: (r) => <span className="mono">{r.total_deductions.toLocaleString()}</span> },
    { key: 'net_pay', label: 'Net Pay', render: (r) => <span className="mono" style={{ fontWeight: 700 }}>{r.net_pay.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status === 'Paid' ? 'active' : r.status === 'Submitted' ? 'leave' : 'inactive'} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Salary Slips</h1>
          <p>All payslips, whether generated via a Payroll Entry or created individually.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={employees.length === 0}>
          + New Salary Slip
        </button>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={slips}
          emptyMessage="No salary slips yet"
          onRowClick={(row) => navigate(`/payroll/salary-slips/${row.id}`)}
        />
      )}

      {showModal && (
        <Modal
          title="New Salary Slip"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={creating}>
                {creating ? 'Creating…' : 'Create Slip'}
              </button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Employee</label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.full_name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Period start</label>
                <input type="date" value={form.pay_period_start} onChange={(e) => setForm({ ...form, pay_period_start: e.target.value })} required />
              </div>
              <div className="field">
                <label>Period end</label>
                <input type="date" value={form.pay_period_end} onChange={(e) => setForm({ ...form, pay_period_end: e.target.value })} required />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
