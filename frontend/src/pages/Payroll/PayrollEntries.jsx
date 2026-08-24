import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listPayrollEntries, createPayrollEntry } from '../../api/payrollApi'
import { listCompanies } from '../../api/companyApi'
import { listDepartments } from '../../api/departmentApi'

export default function PayrollEntries() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [companies, setCompanies] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ company_id: '', department_id: '', pay_period_start: '', pay_period_end: '' })

  const load = () => {
    setLoading(true)
    Promise.all([listPayrollEntries(), listCompanies(), listDepartments()])
      .then(([entRes, compRes, deptRes]) => {
        setEntries(entRes.data)
        setCompanies(compRes.data)
        setDepartments(deptRes.data)
        setForm((f) => ({ ...f, company_id: f.company_id || compRes.data[0]?.id || '' }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const deptName = (id) => id ? (departments.find((d) => d.id === id)?.name || `#${id}`) : 'All departments'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const res = await createPayrollEntry({
        ...form,
        company_id: Number(form.company_id),
        department_id: form.department_id ? Number(form.department_id) : null,
      })
      setShowModal(false)
      navigate(`/payroll/entries/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not generate payroll entry')
    } finally {
      setCreating(false)
    }
  }

  const columns = [
    { key: 'pay_period_start', label: 'Period', render: (r) => <span className="mono">{r.pay_period_start} → {r.pay_period_end}</span> },
    { key: 'department_id', label: 'Department', render: (r) => deptName(r.department_id) },
    { key: 'employee_count', label: 'Employees' },
    { key: 'total_net_pay', label: 'Total Net Pay', render: (r) => <span className="mono">{r.total_net_pay.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status === 'Submitted' ? 'active' : 'leave'} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payroll Entries</h1>
          <p>Generate salary slips for a company/department for a pay period in one go.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={companies.length === 0}>
          + New Payroll Entry
        </button>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          emptyMessage="No payroll entries yet"
          onRowClick={(row) => navigate(`/payroll/entries/${row.id}`)}
        />
      )}

      {showModal && (
        <Modal
          title="New Payroll Entry"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={creating}>
                {creating ? 'Generating…' : 'Generate Salary Slips'}
              </button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
            Creates one Salary Slip per active employee (with a salary set) in this company/department —
            absent days in the period are automatically deducted from the attendance records.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Company</label>
                <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Department (optional)</label>
                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">All departments</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
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
