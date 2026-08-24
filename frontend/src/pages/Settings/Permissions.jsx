import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getPermissionMeta, listPermissions, bulkUpdatePermissions } from '../../api/permissionApi'

export default function Permissions() {
  const { user } = useAuth()
  const [meta, setMeta] = useState({ modules: [], actions: [], roles: [] })
  const [matrix, setMatrix] = useState({}) // matrix[role][module] = { can_read, can_create, can_write, can_delete }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getPermissionMeta(), listPermissions()])
      .then(([metaRes, permRes]) => {
        setMeta(metaRes.data)
        const m = {}
        for (const role of metaRes.data.roles) {
          m[role] = {}
          for (const mod of metaRes.data.modules) {
            m[role][mod] = { can_read: false, can_create: false, can_write: false, can_delete: false }
          }
        }
        for (const p of permRes.data) {
          if (!m[p.role]) m[p.role] = {}
          m[p.role][p.module] = {
            can_read: p.can_read, can_create: p.can_create, can_write: p.can_write, can_delete: p.can_delete,
          }
        }
        setMatrix(m)
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load permissions'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (user && user.role !== 'admin') {
    return <div className="error-banner">Only admins can manage permissions.</div>
  }

  const toggle = (role, module, action) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: { ...prev[role][module], [action]: !prev[role][module][action] },
      },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const permissions = []
      for (const role of meta.roles) {
        for (const module of meta.modules) {
          permissions.push({ role, module, ...matrix[role][module] })
        }
      }
      await bulkUpdatePermissions(permissions)
      setSaved(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Permissions</h1>
          <p>Control what each role can read, create, edit, and delete. "Admin" always has full access.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Permissions saved.</div>}

      {meta.roles.map((role) => (
        <div key={role} className="card" style={{ marginBottom: 18, overflowX: 'auto' }}>
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', textTransform: 'capitalize' }}>
            <strong>{role.replace('_', ' ')}</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Module</th>
                {meta.actions.map((action) => (
                  <th key={action} style={{ textAlign: 'center', textTransform: 'capitalize' }}>{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meta.modules.map((module) => (
                <tr key={module}>
                  <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{module}</td>
                  {meta.actions.map((action) => {
                    const key = `can_${action}`
                    const checked = matrix[role]?.[module]?.[key] || false
                    return (
                      <td key={action} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(role, module, key)}
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
      ))}
    </div>
  )
}
