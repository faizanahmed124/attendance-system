import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listSeparations, createSeparation } from '../../api/onboardingApi'
import { listEmployees } from '../../api/employeeApi'
import { listCompanies } from '../../api/companyApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const DEFAULT_ACTIVITIES = [
  'Collect company laptop & assets',
  'Revoke system & email access',
  'Settle final dues / clearance',
  'Conduct exit interview',
  'Update team & handover tasks',
  'Issue relieving letter',
]

export default function EmployeeSeparations() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ employee_id: '', company_id: '', relieving_date: '', reason: '' })
  const [activities, setActivities] = useState([...DEFAULT_ACTIVITIES])
  const [newActivity, setNewActivity] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listSeparations(), listEmployees(), listCompanies()])
      .then(([sRes, eRes, cRes]) => { setRows(sRes.data); setEmployees(eRes.data); setCompanies(cRes.data) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const empName = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`

  const statusPillType = (status) => {
    if (status === 'Completed') return 'active'
    if (status === 'In Process') return 'Pending'
    return 'inactive'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await createSeparation({
        ...form,
        employee_id: Number(form.employee_id),
        company_id: Number(form.company_id),
        relieving_date: form.relieving_date || null,
        activities: activities.map((name, i) => ({ activity_name: name, sort_order: i })),
      })
      setShowModal(false)
      navigate(`/offboarding/${res.data.id}`)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start offboarding'))
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => empName(r.employee_id) },
    { key: 'resignation_letter_date', label: 'Resignation Date', render: (r) => <span className="mono">{r.resignation_letter_date}</span> },
    { key: 'relieving_date', label: 'Relieving Date', render: (r) => <span className="mono">{r.relieving_date || '—'}</span> },
    { key: 'activities', label: 'Progress', render: (r) => `${r.activities.filter((a) => a.is_completed).length}/${r.activities.length} done` },
    { key: 'boarding_status', label: 'Status', render: (r) => <StatusPill status={statusPillType(r.boarding_status)} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Employee Offboarding</h1>
          <p>Track exit checklists - asset return, access revocation, clearance.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ employee_id: '', company_id: companies[0]?.id || '', relieving_date: '', reason: '' }); setActivities([...DEFAULT_ACTIVITIES]); setError(''); setShowModal(true) }} disabled={employees.length === 0}>
          + New Offboarding
        </button>
      </div>

      {error && !showModal && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={rows} emptyMessage="No offboarding records yet" onRowClick={(r) => navigate(`/offboarding/${r.id}`)} />
      )}

      {showModal && (
        <Modal
          title="Start Employee Offboarding"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Start Offboarding</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Employee</label>
                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required>
                  <option value="">— Select —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Company</label>
                <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} required>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Relieving Date (optional)</label>
                <input type="date" value={form.relieving_date} onChange={(e) => setForm({ ...form, relieving_date: e.target.value })} />
              </div>
              <div className="field">
                <label>Reason</label>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
            </div>

            <div className="field">
              <label>Checklist ({activities.length} items)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {activities.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{a}</span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setActivities(activities.filter((_, idx) => idx !== i))}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newActivity} onChange={(e) => setNewActivity(e.target.value)} placeholder="Add a checklist item" style={{ flex: 1 }} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { if (newActivity.trim()) { setActivities([...activities, newActivity.trim()]); setNewActivity('') } }}>Add</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
