import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listLoanTypes, createLoanType, updateLoanType, deleteLoanType } from '../../api/loanApi'

const emptyForm = { name: '', interest_rate: 0, max_loan_amount: '', is_active: true }

export default function LoanTypes() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    listLoanTypes().then((res) => setTypes(res.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (type) => {
    setEditing(type)
    setForm({
      name: type.name, interest_rate: type.interest_rate,
      max_loan_amount: type.max_loan_amount ?? '', is_active: type.is_active,
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        interest_rate: Number(form.interest_rate),
        max_loan_amount: form.max_loan_amount === '' ? null : Number(form.max_loan_amount),
      }
      if (editing) {
        await updateLoanType(editing.id, payload)
      } else {
        await createLoanType(payload)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save loan type')
    }
  }

  const handleDelete = async (type) => {
    if (!window.confirm(`Delete "${type.name}"?`)) return
    try {
      await deleteLoanType(type.id)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete - it may be in use by existing loans')
    }
  }

  const columns = [
    { key: 'name', label: 'Loan Type' },
    { key: 'interest_rate', label: 'Interest Rate', render: (r) => <span className="mono">{r.interest_rate}% p.a.</span> },
    { key: 'max_loan_amount', label: 'Max Amount', render: (r) => <span className="mono">{r.max_loan_amount != null ? r.max_loan_amount.toLocaleString() : 'No limit'}</span> },
    { key: 'is_active', label: 'Status', render: (r) => <StatusPill status={r.is_active ? 'active' : 'inactive'} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(r) }}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(r) }}>Delete</button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Loan Types</h1>
          <p>Master data for interest rates and borrowing limits - e.g. Personal Loan, Salary Advance.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Loan Type</button>
      </div>

      {error && !showModal && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={types} emptyMessage="No loan types yet" />
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Loan Type' : 'New Loan Type'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Save changes' : 'Create'}</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Personal Loan" required autoFocus />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Interest Rate (% per year)</label>
                <input type="number" step="0.01" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
              </div>
              <div className="field">
                <label>Max Loan Amount (optional)</label>
                <input type="number" step="0.01" value={form.max_loan_amount} onChange={(e) => setForm({ ...form, max_loan_amount: e.target.value })} placeholder="No limit" />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          </form>
        </Modal>
      )}
    </div>
  )
}
