import { useState } from 'react'
import Modal from './Modal'

/**
 * Generic "edit N selected records" modal. Pass a `fields` config describing
 * which field to change - the caller supplies the actual API call.
 *
 * fields = [
 *   { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
 *   { name: 'department_id', label: 'Department', type: 'select', options: [{value: 1, label: 'General'}] },
 * ]
 */
export default function BulkEditModal({ selectedCount, fields, onSubmit, onClose }) {
  const [fieldName, setFieldName] = useState(fields[0]?.name || '')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeField = fields.find((f) => f.name === fieldName)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSubmit(fieldName, value)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not apply bulk edit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Edit ${selectedCount} selected record${selectedCount === 1 ? '' : 's'}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || value === ''}>
            {saving ? 'Applying…' : 'Apply to all selected'}
          </button>
        </>
      }
    >
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Field to change</label>
          <select value={fieldName} onChange={(e) => { setFieldName(e.target.value); setValue('') }}>
            {fields.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>New value</label>
          {activeField?.type === 'select' ? (
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">— Select —</option>
              {activeField.options.map((opt) =>
                typeof opt === 'object'
                  ? <option key={opt.value} value={opt.value}>{opt.label}</option>
                  : <option key={opt} value={opt}>{opt}</option>
              )}
            </select>
          ) : (
            <input value={value} onChange={(e) => setValue(e.target.value)} />
          )}
        </div>
      </form>
    </Modal>
  )
}
