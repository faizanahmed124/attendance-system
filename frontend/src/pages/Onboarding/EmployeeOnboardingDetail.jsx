import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusPill from '../../components/StatusPill'
import { getOnboarding, toggleOnboardingActivity, deleteOnboarding } from '../../api/onboardingApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

export default function EmployeeOnboardingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [onboarding, setOnboarding] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    getOnboarding(id)
      .then(async (res) => {
        setOnboarding(res.data)
        try {
          const empRes = await listEmployees()
          setEmployee(empRes.data.find((e) => e.id === res.data.employee_id))
        } catch (e) { console.error(e) }
      })
      .catch((err) => setError(extractErrorMessage(err, 'Could not load onboarding')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleToggle = async (activity) => {
    try {
      await toggleOnboardingActivity(activity.id, { is_completed: !activity.is_completed })
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update activity'))
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this onboarding record?')) return
    try {
      await deleteOnboarding(id)
      navigate('/onboarding')
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete'))
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !onboarding) return <div className="error-banner">{error}</div>
  if (!onboarding) return null

  const statusPillType = (status) => {
    if (status === 'Completed') return 'active'
    if (status === 'In Process') return 'Pending'
    return 'inactive'
  }
  const doneCount = onboarding.activities.filter((a) => a.is_completed).length
  const pct = onboarding.activities.length > 0 ? Math.round((doneCount / onboarding.activities.length) * 100) : 0

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/onboarding')}>
            ← Back to onboardings
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {employee?.full_name || `Employee #${onboarding.employee_id}`}
            <span style={{ fontSize: 12 }}><StatusPill status={statusPillType(onboarding.boarding_status)} /></span>
          </h1>
          <p>Onboarding · Started {onboarding.boarding_date}</p>
        </div>
        <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-section">
        <div className="form-section-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>
            <span>{doneCount} of {onboarding.activities.length} complete</span><span>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--success)', borderRadius: 999 }} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">1</span> Checklist</div>
        <div className="form-section-body">
          {onboarding.activities.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>No checklist items.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {onboarding.activities.map((a) => (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={a.is_completed} onChange={() => handleToggle(a)} />
                  <span style={{ flex: 1, fontSize: 13.5, textDecoration: a.is_completed ? 'line-through' : 'none', color: a.is_completed ? 'var(--ink-faint)' : 'var(--ink)' }}>
                    {a.activity_name}
                  </span>
                  {a.completed_on && <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{a.completed_on}</span>}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {onboarding.notes && (
        <div className="form-section">
          <div className="form-section-header"><span className="num">2</span> Notes</div>
          <div className="form-section-body">
            <p style={{ fontSize: 13.5 }}>{onboarding.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
