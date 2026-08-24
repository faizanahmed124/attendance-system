import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType } from '../../api/leaveApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const emptyForm = { name: '', max_leaves_allowed: 0, is_carry_forward: false, is_lwp: false, is_encashable: false, is_active: true }

export default function LeaveTypes() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    listLeaveTypes().then((res) => setTypes(res.data)).finally(() => setLoading(false))
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
    setForm({ ...type })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form, max_leaves_allowed: Number(form.max_leaves_allowed) }
      if (editing) {
        await updateLeaveType(editing.id, payload)
      } else {
        await createLeaveType(payload)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save leave type'))
    }
  }

  const handleDelete = async (type) => {
    if (!window.confirm(`Delete "${type.name}"?`)) return
    try {
      await deleteLeaveType(type.id)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete - it may be in use'))
    }
  }

  const columns = [
    { key: 'name', label: 'Leave Type' },
    { key: 'max_leaves_allowed', label: 'Max / Period', render: (r) => <span className="mono">{r.max_leaves_allowed} days</span> },
    { key: 'is_carry_forward', label: 'Carry Forward', render: (r) => r.is_carry_forward ? 'Yes' : 'No' },
    { key: 'is_lwp', label: 'Without Pay', render: (r) => r.is_lwp ? 'Yes' : 'No' },
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
          <h1>Leave Types</h1>
          <p>Master data - e.g. Casual Leave, Sick Leave, Leave Without Pay.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Leave Type</button>
      </div>

      {error && !showModal && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={types} emptyMessage="No leave types yet" />
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Leave Type' : 'New Leave Type'}
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
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Casual Leave" required autoFocus />
            </div>
            <div className="field">
              <label>Max Leaves Allowed (per allocation period)</label>
              <input type="number" step="0.5" value={form.max_leaves_allowed} onChange={(e) => setForm({ ...form, max_leaves_allowed: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_carry_forward} onChange={(e) => setForm({ ...form, is_carry_forward: e.target.checked })} />
                Allow carry-forward to next period
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_lwp} onChange={(e) => setForm({ ...form, is_lwp: e.target.checked })} />
                Leave Without Pay (no balance needed, deducts from salary)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_encashable} onChange={(e) => setForm({ ...form, is_encashable: e.target.checked })} />
                Encashable
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
