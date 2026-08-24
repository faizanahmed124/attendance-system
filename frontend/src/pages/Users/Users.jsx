import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listUsers, createUser } from '../../api/userApi'

const ROLES = ['admin', 'hr_manager', 'employee']

const emptyForm = { full_name: '', email: '', password: '', role: 'employee' }

export default function Users() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    listUsers().then((res) => setUsers(res.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createUser(form)
      setShowModal(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create user')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (r) => <span style={{ textTransform: 'capitalize' }}>{r.role.replace('_', ' ')}</span> },
    { key: 'is_active', label: 'Status', render: (r) => <StatusPill status={r.is_active ? 'active' : 'inactive'} /> },
    { key: 'created_at', label: 'Created', render: (r) => <span className="mono">{new Date(r.created_at).toLocaleDateString()}</span> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Everyone with login access, their role, and account status.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New User</button>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          emptyMessage="No users yet"
          onRowClick={(row) => navigate(`/users/${row.id}`)}
        />
      )}

      {showModal && (
        <Modal
          title="New User"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Creating…' : 'Create User'}
              </button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
