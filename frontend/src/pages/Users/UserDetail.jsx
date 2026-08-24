import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { useAuth } from '../../context/AuthContext'
import { getUser, updateUser, resetUserPassword, deleteUser } from '../../api/userApi'
import { getPermissionMeta, listPermissions, bulkUpdatePermissions } from '../../api/permissionApi'

const ROLES = ['admin', 'hr_manager', 'employee']

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: '', is_active: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // --- Permissions section (scoped to this user's current role) ---
  const [permMeta, setPermMeta] = useState({ modules: [], actions: [] })
  const [permMatrix, setPermMatrix] = useState({})
  const [permLoading, setPermLoading] = useState(true)
  const [permSaving, setPermSaving] = useState(false)
  const [permError, setPermError] = useState('')
  const [permSaved, setPermSaved] = useState(false)

  const isSelf = currentUser?.id === Number(id)

  const load = () => {
    setLoading(true)
    getUser(id)
      .then((res) => {
        setUser(res.data)
        setForm({
          full_name: res.data.full_name, email: res.data.email,
          role: res.data.role, is_active: res.data.is_active,
        })
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load user'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  // load/refresh the permission matrix whenever we know the user's role
  // (including right after it's changed and saved below)
  const loadPermissions = (role) => {
    if (!role || role === 'admin') {
      setPermLoading(false)
      return
    }
    setPermLoading(true)
    setPermSaved(false)
    Promise.all([getPermissionMeta(), listPermissions()])
      .then(([metaRes, permRes]) => {
        setPermMeta(metaRes.data)
        const matrix = {}
        metaRes.data.modules.forEach((mod) => {
          matrix[mod] = { can_read: false, can_create: false, can_write: false, can_delete: false }
        })
        permRes.data
          .filter((p) => p.role === role)
          .forEach((p) => {
            matrix[p.module] = {
              can_read: p.can_read, can_create: p.can_create,
              can_write: p.can_write, can_delete: p.can_delete,
            }
          })
        setPermMatrix(matrix)
      })
      .catch((err) => setPermError(err.response?.data?.detail || 'Could not load permissions'))
      .finally(() => setPermLoading(false))
  }

  useEffect(() => {
    if (user?.role) loadPermissions(user.role)
  }, [user?.role])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const res = await updateUser(id, form)
      setUser(res.data) // triggers the permissions section to reload for the (possibly new) role
      setSaved(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  const togglePerm = (module, action) => {
    setPermMatrix((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: !prev[module][action] },
    }))
    setPermSaved(false)
  }

  const handleSavePermissions = async () => {
    setPermSaving(true)
    setPermError('')
    try {
      const permissions = permMeta.modules.map((module) => ({
        role: user.role,
        module,
        ...permMatrix[module],
      }))
      await bulkUpdatePermissions(permissions)
      setPermSaved(true)
    } catch (err) {
      setPermError(err.response?.data?.detail || 'Could not save permissions')
    } finally {
      setPermSaving(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)
    setPasswordSaving(true)
    try {
      await resetUserPassword(id, newPassword)
      setPasswordSaved(true)
      setNewPassword('')
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Could not reset password')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteUser(id)
      navigate('/users')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete user')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !user) return <div className="error-banner">{error}</div>
  if (!user) return null

  const initials = user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/users')}>
            ← Back to users
          </button>
          <h1>{user.full_name}</h1>
          <p>{user.email} {isSelf && <span style={{ color: 'var(--primary)' }}>(you)</span>}</p>
        </div>
        <button className="btn btn-danger" onClick={() => setConfirmDelete(true)} disabled={isSelf}>Delete</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="profile-layout">
        <div className="profile-photo-card">
          <div className="photo-frame">{initials}</div>
          <div className="profile-name">{user.full_name}</div>
          <div className="profile-code">{user.email}</div>
          <div style={{ marginTop: 10 }}><StatusPill status={user.is_active ? 'active' : 'inactive'} /></div>
          <div className="profile-meta">
            <div className="row"><span>Role</span><span style={{ textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</span></div>
            <div className="row"><span>Created</span><span className="mono">{new Date(user.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>

        <div>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Basic Info</div>
            <div className="form-section-body">
              {saved && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Changes saved.</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label>Full name</label>
                    <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>Role</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={isSelf}>
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Status</label>
                    <select value={form.is_active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })} disabled={isSelf}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                {isSelf && (
                  <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 12 }}>
                    You can't change your own role or deactivate your own account.
                  </p>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">2</span> Password</div>
            <div className="form-section-body">
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
                Set a new password for this user. They'll need to use it next time they log in.
              </p>
              <button className="btn btn-outline" onClick={() => { setShowPasswordModal(true); setPasswordSaved(false); setPasswordError('') }}>
                Reset Password
              </button>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <span className="num">3</span> Permissions
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-faint)', fontWeight: 500, textTransform: 'capitalize' }}>
                {user.role.replace('_', ' ')} role
              </span>
            </div>
            <div className="form-section-body">
              {user.role === 'admin' ? (
                <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  Admins always have full access to every module - there's nothing to configure here.
                </p>
              ) : permLoading ? (
                <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Loading permissions…</div>
              ) : (
                <>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14 }}>
                    This changes what <strong style={{ textTransform: 'capitalize' }}>every "{user.role.replace('_', ' ')}"</strong> user
                    can do, not just {user.full_name.split(' ')[0]} - same as{' '}
                    <Link to="/settings/permissions" style={{ color: 'var(--primary)' }}>Settings → Permissions</Link>.
                  </p>
                  {permError && <div className="error-banner">{permError}</div>}
                  {permSaved && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Permissions saved.</div>}

                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Module</th>
                          {permMeta.actions.map((action) => (
                            <th key={action} style={{ textAlign: 'center', textTransform: 'capitalize' }}>{action}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {permMeta.modules.map((module) => (
                          <tr key={module}>
                            <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{module}</td>
                            {permMeta.actions.map((action) => {
                              const key = `can_${action}`
                              const checked = permMatrix[module]?.[key] || false
                              return (
                                <td key={action} style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePerm(module, key)}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSavePermissions} disabled={permSaving}>
                    {permSaving ? 'Saving…' : 'Save Permissions'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <Modal
          title="Reset Password"
          onClose={() => setShowPasswordModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowPasswordModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={passwordSaving || newPassword.length < 6}>
                {passwordSaving ? 'Saving…' : 'Set New Password'}
              </button>
            </>
          }
        >
          {passwordError && <div className="error-banner">{passwordError}</div>}
          {passwordSaved && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Password updated.</div>}
          <form onSubmit={handleResetPassword}>
            <div className="field">
              <label>New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required autoFocus />
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>At least 6 characters.</p>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Delete {user.full_name}?</h3></div>
            <div className="modal-body">This user will lose access immediately. This can't be undone.</div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}