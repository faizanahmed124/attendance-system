import { useEffect, useState } from 'react'
import { getSystemSettings, updateSystemSettings } from '../../api/systemSettingsApi'

const TIME_ZONES = [
  'Asia/Karachi', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Riyadh',
  'Asia/Istanbul', 'Europe/London', 'Europe/Berlin', 'America/New_York',
  'America/Los_Angeles', 'America/Chicago', 'Australia/Sydney', 'UTC',
]

const DATE_FORMATS = ['dd-mm-yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd']
const TIME_FORMATS = ['HH:mm:ss', 'hh:mm:ss a']
const DAYS = ['Sunday', 'Monday']

export default function SystemSettings() {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = () => {
    setLoading(true)
    getSystemSettings()
      .then((res) => setForm(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load settings'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const res = await updateSystemSettings({
        country: form.country,
        time_zone: form.time_zone,
        language: form.language,
        currency: form.currency,
        date_format: form.date_format,
        time_format: form.time_format,
        first_day_of_week: form.first_day_of_week,
      })
      setForm(res.data)
      setSaved(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !form) return <div className="error-banner">{error}</div>
  if (!form) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System Settings</h1>
          <p>Country, time zone, and date/number formatting used across the whole system.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Settings saved.</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section-header"><span className="num">1</span> General</div>
          <div className="form-section-body">
            <div className="form-grid">
              <div className="field">
                <label>Country</label>
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="field">
                <label>Time Zone</label>
                <select value={form.time_zone} onChange={(e) => setForm({ ...form, time_zone: e.target.value })}>
                  {TIME_ZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Language</label>
                <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
              </div>
              <div className="field">
                <label>Currency</label>
                <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="e.g. PKR" />
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header"><span className="num">2</span> Date &amp; Number Format</div>
          <div className="form-section-body">
            <div className="form-grid">
              <div className="field">
                <label>Date Format</label>
                <select value={form.date_format} onChange={(e) => setForm({ ...form, date_format: e.target.value })}>
                  {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Time Format</label>
                <select value={form.time_format} onChange={(e) => setForm({ ...form, time_format: e.target.value })}>
                  {TIME_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>First Day of the Week</label>
              <select value={form.first_day_of_week} onChange={(e) => setForm({ ...form, first_day_of_week: e.target.value })}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
