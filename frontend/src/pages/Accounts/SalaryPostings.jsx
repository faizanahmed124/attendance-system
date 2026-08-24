import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import { listSalaryPostings, createSalaryPosting } from '../../api/accountsApi'
import { listAccounts } from '../../api/accountsApi'
import { listCompanies } from '../../api/companyApi'
import { listDepartments } from '../../api/departmentApi'

export default function SalaryPostings() {
  const [postings, setPostings] = useState([])
  const [accounts, setAccounts] = useState([])
  const [companies, setCompanies] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    company_id: '', department_id: '', month: '', salary_expense_account_id: '', salary_payable_account_id: '',
  })

  const load = () => {
    setLoading(true)
    Promise.all([listSalaryPostings(), listAccounts(), listCompanies(), listDepartments()])
      .then(([postRes, accRes, compRes, deptRes]) => {
        setPostings(postRes.data)
        setAccounts(accRes.data.filter((a) => !a.is_group))
        setCompanies(compRes.data)
        setDepartments(deptRes.data)
        setForm((f) => ({ ...f, company_id: f.company_id || compRes.data[0]?.id || '' }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const deptName = (id) => id ? (departments.find((d) => d.id === id)?.name || `#${id}`) : 'All departments'
  const expenseAccounts = accounts.filter((a) => a.root_type === 'Expense')
  const liabilityAccounts = accounts.filter((a) => a.root_type === 'Liability')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setPosting(true)
    try {
      const res = await createSalaryPosting({
        ...form,
        company_id: Number(form.company_id),
        department_id: form.department_id ? Number(form.department_id) : null,
        salary_expense_account_id: Number(form.salary_expense_account_id),
        salary_payable_account_id: Number(form.salary_payable_account_id),
      })
      setMessage(`Posted salary for ${res.data.employee_count} employee(s) — total ${res.data.total_amount.toLocaleString()}`)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not post salaries')
    } finally {
      setPosting(false)
    }
  }

  const columns = [
    { key: 'month', label: 'Month', render: (r) => <span className="mono">{r.month}</span> },
    { key: 'department_id', label: 'Department', render: (r) => deptName(r.department_id) },
    { key: 'employee_count', label: 'Employees' },
    { key: 'total_amount', label: 'Total', render: (r) => <span className="mono">{r.total_amount.toLocaleString()}</span> },
    { key: 'created_at', label: 'Posted On', render: (r) => <span className="mono">{new Date(r.created_at).toLocaleDateString()}</span> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Salary Postings</h1>
          <p>Post employee salaries to the ledger — debits Salary Expense per department, credits Salary Payable.</p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        {error && <div className="error-banner">{error}</div>}
        {message && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid-3">
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
            <div className="field">
              <label>Month</label>
              <input type="month" value={form.month.slice(0, 7)} onChange={(e) => setForm({ ...form, month: `${e.target.value}-01` })} required />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Salary Expense account</label>
              <select value={form.salary_expense_account_id} onChange={(e) => setForm({ ...form, salary_expense_account_id: e.target.value })} required>
                <option value="">Select…</option>
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Salary Payable account</label>
              <select value={form.salary_payable_account_id} onChange={(e) => setForm({ ...form, salary_payable_account_id: e.target.value })} required>
                <option value="">Select…</option>
                {liabilityAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={posting}>
            {posting ? 'Posting…' : 'Post Salaries'}
          </button>
        </form>
      </div>

      {loading ? <div className="card card-pad">Loading…</div> : <DataTable columns={columns} data={postings} emptyMessage="No salary postings yet" />}
    </div>
  )
}
