import { useEffect, useState } from 'react'
import { getAttendanceSettings, updateAttendanceSettings } from '../../api/attendanceSettingsApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const TOGGLES = [
  { key: 'enable_overtime_tracking', label: 'Track Overtime', help: 'When on, hours beyond "Standard Duty Hours" count as overtime for employees with "Allow Overtime" enabled on their profile. When off, no Overtime field appears anywhere in Attendance.' },
  { key: 'enable_late_entry_tracking', label: 'Track Late Entry', help: 'When off, the Late Entry field is never calculated or shown.' },
  { key: 'enable_early_exit_tracking', label: 'Track Early Exit', help: 'When off, the Early Exit field is never calculated or shown.' },
  { key: 'enable_half_day_marking', label: 'Auto-mark Half Day', help: "When off, attendance is only ever Present or Absent - it never becomes Half Day based on a shift's working-hours threshold." },
  { key: 'enable_auto_absent_marking', label: 'Auto-mark Absent by Hours', help: "When off, an employee is only marked Absent if they didn't check in at all - working very few hours won't flip them to Absent." },
]

export default function AttendanceSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = () => {
    setLoading(true)
    getAttendanceSettings().then((res) => setSettings(res.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggle = (key) => setSettings({ ...settings, [key]: !settings[key] })

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await updateAttendanceSettings({
        enable_overtime_tracking: settings.enable_overtime_tracking,
        standard_duty_hours: Number(settings.standard_duty_hours),
        enable_late_entry_tracking: settings.enable_late_entry_tracking,
        enable_early_exit_tracking: settings.enable_early_exit_tracking,
        enable_half_day_marking: settings.enable_half_day_marking,
        enable_auto_absent_marking: settings.enable_auto_absent_marking,
      })
      setSettings(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save attendance settings'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (!settings) return null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Attendance Settings</h1>
          <p>Company-wide switches controlling how attendance is calculated and displayed. Turning a setting off removes that field from Attendance entirely - not just hides it, it's never calculated.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {saved && <div style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>Saved.</div>}

      <div className="form-section">
        <div className="form-section-header"><span className="num">1</span> Duty Hours</div>
        <div className="form-section-body">
          <div className="field">
            <label>Standard Duty Hours</label>
            <input
              type="number" step="0.5" min="1" max="24"
              value={settings.standard_duty_hours}
              onChange={(e) => setSettings({ ...settings, standard_duty_hours: e.target.value })}
              style={{ maxWidth: 160 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              The regular working day length used for overtime employees - hours beyond this are overtime instead of regular hours.
            </span>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">2</span> What to Track</div>
        <div className="form-section-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {TOGGLES.map((t) => (
              <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{t.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{t.help}</div>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 42, height: 24, flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={settings[t.key]}
                    onChange={() => toggle(t.key)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: settings[t.key] ? 'var(--primary)' : 'var(--border)',
                    borderRadius: 999, transition: 'background 0.15s',
                  }}>
                    <span style={{
                      position: 'absolute', height: 18, width: 18, left: settings[t.key] ? 21 : 3, bottom: 3,
                      background: '#fff', borderRadius: '50%', transition: 'left 0.15s',
                    }} />
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
