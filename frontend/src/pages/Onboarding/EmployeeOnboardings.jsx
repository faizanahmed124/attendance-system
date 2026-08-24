import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listOnboardings, createOnboarding } from '../../api/onboardingApi'
import { listEmployees } from '../../api/employeeApi'
import { listCompanies } from '../../api/companyApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const DEFAULT_ACTIVITIES = [
  'Prepare workstation & equipment',
  'Setup company email & accounts',
  'HR orientation & policy briefing',
  'Introduce to team',
  'Assign onboarding buddy',
  'Collect signed documents',
]

export default function EmployeeOnboardings() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ employee_id: '', company_id: '', notes: '' })
  const [activities, setActivities] = useState([...DEFAULT_ACTIVITIES])
  const [newActivity, setNewActivity] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listOnboardings(), listEmployees(), listCompanies()])
      .then(([oRes, eRes, cRes]) => { setRows(oRes.data); setEmployees(eRes.data); setCompanies(cRes.data) })
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
      const res = await createOnboarding({
        ...form,
        employee_id: Number(form.employee_id),
        company_id: Number(form.company_id),
        activities: activities.map((name, i) => ({ activity_name: name, sort_order: i })),
      })
      setShowModal(false)
      navigate(`/onboarding/${res.data.id}`)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start onboarding'))
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => empName(r.employee_id) },
    { key: 'boarding_date', label: 'Start Date', render: (r) => <span className="mono">{r.boarding_date}</span> },
    { key: 'activities', label: 'Progress', render: (r) => `${r.activities.filter((a) => a.is_completed).length}/${r.activities.length} done` },
    { key: 'boarding_status', label: 'Status', render: (r) => <StatusPill status={statusPillType(r.boarding_status)} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Employee Onboarding</h1>
          <p>Track new hire checklists from day one through full ramp-up.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ employee_id: '', company_id: companies[0]?.id || '', notes: '' }); setActivities([...DEFAULT_ACTIVITIES]); setError(''); setShowModal(true) }} disabled={employees.length === 0}>
          + New Onboarding
        </button>
      </div>

      {error && !showModal && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={rows} emptyMessage="No onboarding records yet" onRowClick={(r) => navigate(`/onboarding/${r.id}`)} />
      )}

      {showModal && (
        <Modal
          title="Start Employee Onboarding"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Start Onboarding</button>
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
