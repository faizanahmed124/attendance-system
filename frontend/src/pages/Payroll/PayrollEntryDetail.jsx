import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { getPayrollEntry, postPayrollToJournal, deletePayrollEntry } from '../../api/payrollApi'
import { listAccounts } from '../../api/accountsApi'
import { listEmployees } from '../../api/employeeApi'

export default function PayrollEntryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showPostModal, setShowPostModal] = useState(false)
  const [postForm, setPostForm] = useState({ salary_expense_account_id: '', salary_payable_account_id: '' })
  const [posting, setPosting] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getPayrollEntry(id), listAccounts(), listEmployees()])
      .then(([entRes, accRes, empRes]) => {
        setEntry(entRes.data)
        setAccounts(accRes.data.filter((a) => !a.is_group))
        setEmployees(empRes.data)
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load payroll entry'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const employeeLabel = (empId) => {
    const emp = employees.find((e) => e.id === empId)
    return emp ? `${emp.employee_code} — ${emp.full_name}` : `#${empId}`
  }

  const expenseAccounts = accounts.filter((a) => a.root_type === 'Expense')
  const liabilityAccounts = accounts.filter((a) => a.root_type === 'Liability')

  const handlePost = async (e) => {
    e.preventDefault()
    setError('')
    setPosting(true)
    try {
      await postPayrollToJournal(id, {
        salary_expense_account_id: Number(postForm.salary_expense_account_id),
        salary_payable_account_id: Number(postForm.salary_payable_account_id),
      })
      setShowPostModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not post to journal')
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this payroll entry and all its salary slips?')) return
    try {
      await deletePayrollEntry(id)
      navigate('/payroll/entries')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete payroll entry')
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !entry) return <div className="error-banner">{error}</div>
  if (!entry) return null

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => employeeLabel(r.employee_id) },
    { key: 'basic_salary', label: 'Basic', render: (r) => <span className="mono">{r.basic_salary.toLocaleString()}</span> },
    { key: 'absent_days', label: 'Absent Days', render: (r) => <span className="mono">{r.absent_days}</span> },
    { key: 'gross_pay', label: 'Gross', render: (r) => <span className="mono">{r.gross_pay.toLocaleString()}</span> },
    { key: 'total_deductions', label: 'Deductions', render: (r) => <span className="mono">{r.total_deductions.toLocaleString()}</span> },
    { key: 'net_pay', label: 'Net Pay', render: (r) => <span className="mono" style={{ fontWeight: 700 }}>{r.net_pay.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status === 'Paid' ? 'active' : r.status === 'Submitted' ? 'leave' : 'inactive'} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/payroll/entries')}>
            ← Back to payroll entries
          </button>
          <h1>Payroll · {entry.pay_period_start} → {entry.pay_period_end}</h1>
          <p>{entry.employee_count} employee(s) · Total net pay <strong className="mono">{entry.total_net_pay.toLocaleString()}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!entry.journal_entry_id ? (
            <button className="btn btn-primary" onClick={() => setShowPostModal(true)}>Post to Journal</button>
          ) : (
            <StatusPill status="active" />
          )}
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable
        columns={columns}
        data={entry.salary_slips}
        emptyMessage="No salary slips generated"
        onRowClick={(row) => navigate(`/payroll/salary-slips/${row.id}`)}
      />

      {showPostModal && (
        <Modal
          title="Post Payroll to Journal"
          onClose={() => setShowPostModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowPostModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePost} disabled={posting}>
                {posting ? 'Posting…' : 'Post'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
            Debits Salary Expense (tagged per employee's department), credits Salary Payable for the total.
          </p>
          <form onSubmit={handlePost}>
            <div className="field">
              <label>Salary Expense account</label>
              <select value={postForm.salary_expense_account_id} onChange={(e) => setPostForm({ ...postForm, salary_expense_account_id: e.target.value })} required>
                <option value="">Select…</option>
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Salary Payable account</label>
              <select value={postForm.salary_payable_account_id} onChange={(e) => setPostForm({ ...postForm, salary_payable_account_id: e.target.value })} required>
                <option value="">Select…</option>
                {liabilityAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
