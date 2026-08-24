import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import {
  getSalaryStructure, createSalaryStructure, updateSalaryStructure, listSalaryComponents,
} from '../../api/salaryStructureApi'
import { listCompanies } from '../../api/companyApi'
import { extractErrorMessage } from '../../utils/errorMessage'

export default function SalaryStructureForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [lines, setLines] = useState([]) // [{salary_component_id, amount_override, formula_override}]
  const [components, setComponents] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listSalaryComponents(), listCompanies()])
      .then(([compRes, companyRes]) => {
        setComponents(compRes.data.filter((c) => c.is_active))
        setCompanies(companyRes.data)
        if (!isEdit && companyRes.data.length) setCompanyId(companyRes.data[0].id)
      })
      .finally(() => { if (!isEdit) setLoading(false) })

    if (isEdit) {
      getSalaryStructure(id).then((res) => {
        setName(res.data.name)
        setCompanyId(res.data.company_id)
        setIsActive(res.data.is_active)
        setLines(res.data.components.map((c) => ({
          salary_component_id: c.salary_component_id,
          amount_override: c.amount_override ?? '',
          formula_override: c.formula_override ?? '',
        })))
      }).finally(() => setLoading(false))
    }
  }, [id])

  const addLine = () => {
    if (components.length === 0) return
    setLines([...lines, { salary_component_id: components[0].id, amount_override: '', formula_override: '' }])
  }
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i, field, value) => {
    const next = [...lines]
    next[i] = { ...next[i], [field]: value }
    setLines(next)
  }

  const componentFor = (id) => components.find((c) => c.id === Number(id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        name, company_id: Number(companyId), is_active: isActive,
        components: lines.map((l, i) => ({
          salary_component_id: Number(l.salary_component_id),
          amount_override: l.amount_override === '' ? null : Number(l.amount_override),
          formula_override: l.formula_override || null,
          sort_order: i,
        })),
      }
      if (isEdit) await updateSalaryStructure(id, payload)
      else await createSalaryStructure(payload)
      navigate('/payroll/salary-structures')
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save salary structure'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/payroll/salary-structures')}>
            ← Back to structures
          </button>
          <h1>{isEdit ? 'Edit Salary Structure' : 'New Salary Structure'}</h1>
          <p>Combine Salary Components into a reusable template.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {components.length === 0 && !loading && (
        <div className="error-banner">Create at least one Salary Component first.</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section-header"><span className="num">1</span> Basic Info</div>
          <div className="form-section-body">
            <div className="form-grid">
              <div className="field">
                <label>Structure name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Grade A" required autoFocus />
              </div>
              <div className="field">
                <label>Company</label>
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <span className="num">2</span> Components
            <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={addLine} disabled={components.length === 0}>
              <Plus size={13} /> Add Component
            </button>
          </div>
          <div className="form-section-body">
            {lines.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>No components added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lines.map((line, i) => {
                  const comp = componentFor(line.salary_component_id)
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', padding: '10px', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div className="field" style={{ flex: 2, marginBottom: 0 }}>
                        <label>Component</label>
                        <select value={line.salary_component_id} onChange={(e) => updateLine(i, 'salary_component_id', e.target.value)}>
                          {components.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.component_type})</option>)}
                        </select>
                      </div>
                      <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Amount Override</label>
                        <input type="number" step="0.01" value={line.amount_override} onChange={(e) => updateLine(i, 'amount_override', e.target.value)} placeholder={comp?.amount ?? '—'} disabled={!!line.formula_override} />
                      </div>
                      <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Formula Override</label>
                        <input value={line.formula_override} onChange={(e) => updateLine(i, 'formula_override', e.target.value)} placeholder={comp?.formula || '—'} disabled={!!line.amount_override} />
                      </div>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLine(i)}><Trash2 size={13} /></button>
                    </div>
                  )
                })}
              </div>
            )}
            <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 10 }}>
              Leave both Amount and Formula Override blank to just use the component's own default. Only one override should be set per line.
            </p>
          </div>
        </div>

        <div className="sticky-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/payroll/salary-structures')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create Structure'}
          </button>
        </div>
      </form>
    </div>
  )
}
