import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listExpenseClaims, createExpenseClaim, postExpenseToJournal } from '../../api/accountsApi'
import { listAccounts } from '../../api/accountsApi'
import { listEmployees } from '../../api/employeeApi'
import { listDepartments } from '../../api/departmentApi'

export default function ExpenseClaims() {
  const [claims, setClaims] = useState([])
  const [accounts, setAccounts] = useState([])
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [postingClaim, setPostingClaim] = useState(null)
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    employee_id: '', department_id: '', expense_account_id: '', amount: '', expense_date: '', description: '',
  })

  const load = () => {
    setLoading(true)
    Promise.all([listExpenseClaims(), listAccounts(), listEmployees(), listDepartments()])
      .then(([claimRes, accRes, empRes, deptRes]) => {
        setClaims(claimRes.data)
        setAccounts(accRes.data.filter((a) => !a.is_group))
        setEmployees(empRes.data)
        setDepartments(deptRes.data)
        setForm((f) => ({ ...f, employee_id: f.employee_id || empRes.data[0]?.id || '' }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const employeeLabel = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`
  const accountName = (id) => accounts.find((a) => a.id === id)?.account_name || `#${id}`
  const expenseAccounts = accounts.filter((a) => a.root_type === 'Expense')
  const paymentAccounts = accounts.filter((a) => a.root_type === 'Asset')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createExpenseClaim({
        ...form,
        employee_id: Number(form.employee_id),
        department_id: form.department_id ? Number(form.department_id) : null,
        expense_account_id: Number(form.expense_account_id),
        amount: Number(form.amount),
      })
      setShowModal(false)
      setForm({ ...form, expense_account_id: '', amount: '', expense_date: '', description: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create expense claim')
    }
  }

  const handlePost = async () => {
    if (!paymentAccountId) return
    setError('')
    try {
      await postExpenseToJournal(postingClaim.id, { payment_account_id: Number(paymentAccountId) })
      setPostingClaim(null)
      setPaymentAccountId('')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not post expense to journal')
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => employeeLabel(r.employee_id) },
    { key: 'expense_account_id', label: 'Expense Account', render: (r) => accountName(r.expense_account_id) },
    { key: 'amount', label: 'Amount', render: (r) => <span className="mono">{r.amount.toLocaleString()}</span> },
    { key: 'expense_date', label: 'Date', render: (r) => <span className="mono">{r.expense_date}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status === 'Paid' ? 'active' : 'leave'} /> },
    {
      key: 'actions', label: '',
      render: (r) => r.status !== 'Paid' ? (
        <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setPostingClaim(r) }}>Post to Journal</button>
      ) : <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Posted</span>,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Expense Claims</h1>
          <p>Expenses incurred by employees, postable straight to the ledger.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={employees.length === 0}>
          + New Expense Claim
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? <div className="card card-pad">Loading…</div> : <DataTable columns={columns} data={claims} emptyMessage="No expense claims yet" />}

      {showModal && (
        <Modal
          title="New Expense Claim"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Create Claim</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Employee</label>
                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Department (optional)</label>
                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">—</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Expense account</label>
                <select value={form.expense_account_id} onChange={(e) => setForm({ ...form, expense_account_id: e.target.value })} required>
                  <option value="">Select…</option>
                  {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Amount</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {postingClaim && (
        <Modal
          title="Post to Journal"
          onClose={() => setPostingClaim(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setPostingClaim(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePost} disabled={!paymentAccountId}>Post</button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
            This debits <strong>{accountName(postingClaim.expense_account_id)}</strong> for {postingClaim.amount.toLocaleString()}, and credits the payment account you choose below.
          </p>
          <div className="field">
            <label>Pay from</label>
            <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}>
              <option value="">Select account…</option>
              {paymentAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </div>
  )
}
