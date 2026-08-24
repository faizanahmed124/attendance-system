import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusPill from '../../components/StatusPill'
import { getSeparation, toggleSeparationActivity, updateSeparation, deleteSeparation } from '../../api/onboardingApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

export default function EmployeeSeparationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [separation, setSeparation] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    getSeparation(id)
      .then(async (res) => {
        setSeparation(res.data)
        try {
          const empRes = await listEmployees()
          setEmployee(empRes.data.find((e) => e.id === res.data.employee_id))
        } catch (e) { console.error(e) }
      })
      .catch((err) => setError(extractErrorMessage(err, 'Could not load offboarding')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleToggle = async (activity) => {
    try {
      await toggleSeparationActivity(activity.id, { is_completed: !activity.is_completed })
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update activity'))
    }
  }

  const handleExitInterviewToggle = async () => {
    try {
      await updateSeparation(id, { exit_interview_held: !separation.exit_interview_held })
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update'))
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this offboarding record?')) return
    try {
      await deleteSeparation(id)
      navigate('/offboarding')
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete'))
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !separation) return <div className="error-banner">{error}</div>
  if (!separation) return null

  const statusPillType = (status) => {
    if (status === 'Completed') return 'active'
    if (status === 'In Process') return 'Pending'
    return 'inactive'
  }
  const doneCount = separation.activities.filter((a) => a.is_completed).length
  const pct = separation.activities.length > 0 ? Math.round((doneCount / separation.activities.length) * 100) : 0

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/offboarding')}>
            ← Back to offboardings
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {employee?.full_name || `Employee #${separation.employee_id}`}
            <span style={{ fontSize: 12 }}><StatusPill status={statusPillType(separation.boarding_status)} /></span>
          </h1>
          <p>Offboarding · Resigned {separation.resignation_letter_date}{separation.relieving_date ? ` · Relieving ${separation.relieving_date}` : ''}</p>
        </div>
        <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-section">
        <div className="form-section-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>
            <span>{doneCount} of {separation.activities.length} complete</span><span>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--success)', borderRadius: 999 }} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">1</span> Checklist</div>
        <div className="form-section-body">
          {separation.activities.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>No checklist items.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {separation.activities.map((a) => (
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

      <div className="form-section">
        <div className="form-section-header"><span className="num">2</span> Exit Interview</div>
        <div className="form-section-body">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={separation.exit_interview_held} onChange={handleExitInterviewToggle} />
            Exit interview held
          </label>
          {separation.reason && <p style={{ fontSize: 13.5, marginTop: 10 }}><strong>Reason:</strong> {separation.reason}</p>}
        </div>
      </div>
    </div>
  )
}
