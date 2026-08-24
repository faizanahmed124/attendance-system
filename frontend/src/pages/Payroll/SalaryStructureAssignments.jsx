import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { listAssignments, createAssignment, deleteAssignment, listSalaryStructures } from '../../api/salaryStructureApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const today = new Date().toISOString().slice(0, 10)
const emptyForm = { employee_id: '', salary_structure_id: '', company_id: '', from_date: today, base: '', variable: 0 }

export default function SalaryStructureAssignments() {
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listAssignments(), listEmployees(), listSalaryStructures()])
      .then(([aRes, eRes, sRes]) => { setAssignments(aRes.data); setEmployees(eRes.data); setStructures(sRes.data) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const empName = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`
  const structName = (id) => structures.find((s) => s.id === id)?.name || `#${id}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const struct = structures.find((s) => s.id === Number(form.salary_structure_id))
      await createAssignment({
        ...form,
        employee_id: Number(form.employee_id),
        salary_structure_id: Number(form.salary_structure_id),
        company_id: struct?.company_id,
        base: Number(form.base),
        variable: Number(form.variable || 0),
      })
      setShowModal(false)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create assignment'))
    }
  }

  const handleDelete = async (a) => {
    if (!window.confirm('Delete this assignment?')) return
    try {
      await deleteAssignment(a.id)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete assignment'))
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => empName(r.employee_id) },
    { key: 'salary_structure_id', label: 'Structure', render: (r) => structName(r.salary_structure_id) },
    { key: 'from_date', label: 'From', render: (r) => <span className="mono">{r.from_date}</span> },
    { key: 'base', label: 'Base', render: (r) => <span className="mono">{r.base.toLocaleString()}</span> },
    { key: 'variable', label: 'Variable', render: (r) => <span className="mono">{r.variable.toLocaleString()}</span> },
    {
      key: 'actions', label: '',
      render: (r) => <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(r) }}>Delete</button>,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Salary Structure Assignments</h1>
          <p>Which structure each employee is on, and their base pay used in formulas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setPreview(null); setError(''); setShowModal(true) }} disabled={employees.length === 0 || structures.length === 0}>
          + New Assignment
        </button>
      </div>

      {structures.length === 0 && !loading && (
        <div className="error-banner">Create a Salary Structure first.</div>
      )}
      {error && !showModal && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={assignments} emptyMessage="No salary structure assignments yet" />
      )}

      {showModal && (
        <Modal
          title="New Salary Structure Assignment"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Assign</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Employee</label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required>
                <option value="">— Select —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Salary Structure</label>
              <select value={form.salary_structure_id} onChange={(e) => setForm({ ...form, salary_structure_id: e.target.value })} required>
                <option value="">— Select —</option>
                {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>From Date</label>
                <input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} required />
              </div>
              <div className="field">
                <label>Base</label>
                <input type="number" step="0.01" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} required />
              </div>
            </div>
            <div className="field">
              <label>Variable (optional, e.g. a bonus pool)</label>
              <input type="number" step="0.01" value={form.variable} onChange={(e) => setForm({ ...form, variable: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
