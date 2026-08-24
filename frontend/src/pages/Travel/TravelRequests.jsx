import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listTravelRequests, createTravelRequest, updateTravelRequest } from '../../api/travelRequestApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const emptyForm = { employee_id: '', purpose: '', travel_type: 'Domestic', destination: '', from_date: '', to_date: '', estimated_cost: '', advance_amount: '' }

export default function TravelRequests() {
  const [requests, setRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listTravelRequests(), listEmployees()])
      .then(([rRes, eRes]) => { setRequests(rRes.data); setEmployees(eRes.data) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const empName = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`

  const statusPillType = (status) => {
    if (status === 'Approved') return 'active'
    if (status === 'Rejected') return 'inactive'
    return 'Pending'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createTravelRequest({
        ...form,
        employee_id: Number(form.employee_id),
        estimated_cost: form.estimated_cost === '' ? null : Number(form.estimated_cost),
        advance_amount: form.advance_amount === '' ? null : Number(form.advance_amount),
      })
      setShowModal(false)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not submit travel request'))
    }
  }

  const handleStatusChange = async (r, status) => {
    try {
      await updateTravelRequest(r.id, { status })
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update status'))
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => empName(r.employee_id) },
    { key: 'destination', label: 'Destination' },
    { key: 'travel_type', label: 'Type' },
    { key: 'from_date', label: 'From', render: (r) => <span className="mono">{r.from_date}</span> },
    { key: 'to_date', label: 'To', render: (r) => <span className="mono">{r.to_date}</span> },
    { key: 'estimated_cost', label: 'Est. Cost', render: (r) => <span className="mono">{r.estimated_cost != null ? r.estimated_cost.toLocaleString() : '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={statusPillType(r.status)} /> },
    {
      key: 'actions', label: '',
      render: (r) => r.status === 'Open' ? (
        <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-outline btn-sm" onClick={() => handleStatusChange(r, 'Approved')}>Approve</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(r, 'Rejected')}>Reject</button>
        </div>
      ) : null,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Travel Requests</h1>
          <p>Employee requests for approval to travel on company business.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setError(''); setShowModal(true) }} disabled={employees.length === 0}>
          + New Travel Request
        </button>
      </div>

      {error && !showModal && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={requests} emptyMessage="No travel requests yet" />
      )}

      {showModal && (
        <Modal
          title="New Travel Request"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Submit Request</button>
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
            <div className="form-grid">
              <div className="field">
                <label>Destination</label>
                <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
              </div>
              <div className="field">
                <label>Travel Type</label>
                <select value={form.travel_type} onChange={(e) => setForm({ ...form, travel_type: e.target.value })}>
                  <option value="Domestic">Domestic</option>
                  <option value="International">International</option>
                </select>
              </div>
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
            <div className="field">
              <label>Purpose</label>
              <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Estimated Cost (optional)</label>
                <input type="number" step="0.01" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} />
              </div>
              <div className="field">
                <label>Advance Requested (optional)</label>
                <input type="number" step="0.01" value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
