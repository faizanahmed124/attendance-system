import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { listLeaveAllocations, createLeaveAllocation, deleteLeaveAllocation } from '../../api/leaveApi'
import { listLeaveTypes } from '../../api/leaveApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const today = new Date().toISOString().slice(0, 10)
const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10)

const emptyForm = { employee_id: '', leave_type_id: '', from_date: today, to_date: nextYear, total_leaves_allocated: '', carry_forwarded_leaves: 0 }

export default function LeaveAllocations() {
  const [allocations, setAllocations] = useState([])
  const [employees, setEmployees] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listLeaveAllocations(), listEmployees(), listLeaveTypes()])
      .then(([allocRes, empRes, typeRes]) => {
        setAllocations(allocRes.data)
        setEmployees(empRes.data)
        setLeaveTypes(typeRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const empName = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`
  const typeName = (id) => leaveTypes.find((t) => t.id === id)?.name || `#${id}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createLeaveAllocation({
        ...form,
        employee_id: Number(form.employee_id),
        leave_type_id: Number(form.leave_type_id),
        total_leaves_allocated: Number(form.total_leaves_allocated),
        carry_forwarded_leaves: Number(form.carry_forwarded_leaves || 0),
      })
      setShowModal(false)
      setForm({ ...emptyForm, employee_id: form.employee_id })
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create allocation'))
    }
  }

  const handleDelete = async (allocation) => {
    if (!window.confirm('Delete this allocation?')) return
    try {
      await deleteLeaveAllocation(allocation.id)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete allocation'))
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => empName(r.employee_id) },
    { key: 'leave_type_id', label: 'Leave Type', render: (r) => typeName(r.leave_type_id) },
    { key: 'from_date', label: 'From', render: (r) => <span className="mono">{r.from_date}</span> },
    { key: 'to_date', label: 'To', render: (r) => <span className="mono">{r.to_date}</span> },
    { key: 'total_leaves_allocated', label: 'Allocated', render: (r) => <span className="mono">{r.total_leaves_allocated}</span> },
    { key: 'carry_forwarded_leaves', label: 'Carry Forwarded', render: (r) => <span className="mono">{r.carry_forwarded_leaves}</span> },
    {
      key: 'actions', label: '',
      render: (r) => <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(r) }}>Delete</button>,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leave Allocations</h1>
          <p>How many days of each leave type an employee has for a given period.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setError(''); setShowModal(true) }} disabled={employees.length === 0 || leaveTypes.length === 0}>
          + New Allocation
        </button>
      </div>

      {leaveTypes.length === 0 && !loading && (
        <div className="error-banner">Create a Leave Type first before allocating leaves.</div>
      )}
      {error && !showModal && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={allocations} emptyMessage="No leave allocations yet" />
      )}

      {showModal && (
        <Modal
          title="New Leave Allocation"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Allocate</button>
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
              <label>Leave Type</label>
              <select value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })} required>
                <option value="">— Select —</option>
                {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>From Date</label>
                <input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} required />
              </div>
              <div className="field">
                <label>To Date</label>
                <input type="date" value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} required />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Total Leaves Allocated</label>
                <input type="number" step="0.5" value={form.total_leaves_allocated} onChange={(e) => setForm({ ...form, total_leaves_allocated: e.target.value })} required />
              </div>
              <div className="field">
                <label>Carry Forwarded (optional)</label>
                <input type="number" step="0.5" value={form.carry_forwarded_leaves} onChange={(e) => setForm({ ...form, carry_forwarded_leaves: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
