import { useState } from 'react'
import { Play, CheckCircle2, AlertTriangle } from 'lucide-react'
import { processAttendance } from '../../api/autoAttendanceApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

export default function ProcessAttendance() {
  const [fromDate, setFromDate] = useState(weekAgo)
  const [toDate, setToDate] = useState(today)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleRun = async () => {
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const res = await processAttendance(fromDate, toDate)
      setResult(res.data)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not process attendance'))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Process Attendance</h1>
          <p>Turns raw biometric check-ins into daily attendance records, using each employee's assigned shift's grace periods and hour thresholds. Safe to re-run - never creates duplicates.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card card-pad">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleRun} disabled={running}>
            <Play size={13} style={{ marginRight: 6 }} /> {running ? 'Processing…' : 'Process Attendance'}
          </button>
        </div>
      </div>

      {result && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CheckCircle2 size={16} style={{ color: 'var(--success, var(--primary))' }} />
            <strong>Processed {result.processed} employee-day record(s)</strong>
          </div>
          {result.total_overtime_hours > 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, marginBottom: 14 }}>
              Total overtime credited: {result.total_overtime_hours}h (only for employees with "Allow Overtime" enabled)
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {Object.entries(result.status_counts).map(([status, count]) => (
              <div key={status} style={{ flex: 1, background: 'var(--surface-soft)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{status}</div>
              </div>
            ))}
          </div>

          {result.employees_without_shift.length > 0 && (
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)' }}>
                <AlertTriangle size={14} /> {result.employees_without_shift.length} active employee(s) have no Shift Assignment (skipped - can't compute attendance without a shift):
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.employees_without_shift.map((e) => (
                  <span key={e.employee_code} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 999, background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    {e.employee_code} — {e.full_name}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>
                Assign these employees a shift under Attendance → Shift Assignments, then re-run.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
