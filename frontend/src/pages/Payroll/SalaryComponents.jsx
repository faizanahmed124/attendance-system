import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listSalaryComponents, createSalaryComponent, updateSalaryComponent, deleteSalaryComponent } from '../../api/salaryStructureApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const emptyForm = {
  name: '', component_type: 'Earning', abbreviation: '',
  is_formula_based: false, formula: '', amount: '',
  depends_on_payment_days: true, is_tax_applicable: false, is_active: true,
}

export default function SalaryComponents() {
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    listSalaryComponents().then((res) => setComponents(res.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ ...c, formula: c.formula || '', amount: c.amount ?? '', abbreviation: c.abbreviation || '' })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        formula: form.is_formula_based ? form.formula : null,
        amount: form.is_formula_based ? null : (form.amount === '' ? null : Number(form.amount)),
      }
      if (editing) await updateSalaryComponent(editing.id, payload)
      else await createSalaryComponent(payload)
      setShowModal(false)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save salary component'))
    }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return
    try {
      await deleteSalaryComponent(c.id)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete - it may be used in a Salary Structure'))
    }
  }

  const columns = [
    { key: 'name', label: 'Component' },
    { key: 'component_type', label: 'Type', render: (r) => <StatusPill status={r.component_type === 'Earning' ? 'active' : 'inactive'} /> },
    { key: 'value', label: 'Value', render: (r) => r.is_formula_based ? <span className="mono">{r.formula}</span> : <span className="mono">{r.amount?.toLocaleString() ?? '—'}</span> },
    { key: 'depends_on_payment_days', label: 'Pro-rated', render: (r) => r.depends_on_payment_days ? 'Yes' : 'No' },
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
          <h1>Salary Components</h1>
          <p>Building blocks for Salary Structures - e.g. Basic Pay, HRA, Provident Fund, Income Tax.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Component</button>
      </div>

      {error && !showModal && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={components} emptyMessage="No salary components yet" />
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Salary Component' : 'New Salary Component'}
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
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Basic Pay" required autoFocus />
              </div>
              <div className="field">
                <label>Abbreviation</label>
                <input value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} placeholder="e.g. BP" />
              </div>
            </div>
            <div className="field">
              <label>Type</label>
              <select value={form.component_type} onChange={(e) => setForm({ ...form, component_type: e.target.value })}>
                <option value="Earning">Earning</option>
                <option value="Deduction">Deduction</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              <input type="checkbox" checked={form.is_formula_based} onChange={(e) => setForm({ ...form, is_formula_based: e.target.checked })} />
              Formula-based (instead of a fixed amount)
            </label>

            {form.is_formula_based ? (
              <div className="field">
                <label>Formula</label>
                <input value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} placeholder="e.g. base*0.4" required />
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  Available variables: <code className="mono">base</code>, <code className="mono">variable</code>, <code className="mono">payment_days</code>, <code className="mono">working_days</code>. Operators: + - * / ( )
                </span>
              </div>
            ) : (
              <div className="field">
                <label>Fixed Amount</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.depends_on_payment_days} onChange={(e) => setForm({ ...form, depends_on_payment_days: e.target.checked })} />
                Depends on Payment Days (pro-rate for absences)
              </label>
              {form.component_type === 'Earning' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={form.is_tax_applicable} onChange={(e) => setForm({ ...form, is_tax_applicable: e.target.checked })} />
                  Tax Applicable
                </label>
              )}
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
