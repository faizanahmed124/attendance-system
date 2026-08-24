import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createApplicant, listJobOpenings } from '../../api/recruitmentApi'

export default function ApplicantForm() {
  const navigate = useNavigate()
  const [jobOpenings, setJobOpenings] = useState([])
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', job_opening_id: '', expected_salary: '', notes: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listJobOpenings({ status: 'Open' }).then((res) => {
      setJobOpenings(res.data)
      if (res.data.length > 0) setForm((f) => ({ ...f, job_opening_id: res.data[0].id }))
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await createApplicant({
        ...form,
        job_opening_id: Number(form.job_opening_id),
        expected_salary: form.expected_salary !== '' ? Number(form.expected_salary) : null,
      })
      navigate(`/recruitment/applicants/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create applicant')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/recruitment/applicants')}>
            ← Back to applicants
          </button>
          <h1>New Applicant</h1>
          <p>Add a candidate who has applied for one of your open positions.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {jobOpenings.length === 0 ? (
        <div className="error-banner">No open job openings — create one first under Job Openings.</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Applicant Details</div>
            <div className="form-section-body">
              <div className="form-grid">
                <div className="field">
                  <label>Full name</label>
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="field">
                  <label>Expected salary</label>
                  <input type="number" step="0.01" value={form.expected_salary} onChange={(e) => setForm({ ...form, expected_salary: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Job opening</label>
                <select value={form.job_opening_id} onChange={(e) => setForm({ ...form, job_opening_id: e.target.value })}>
                  {jobOpenings.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Notes (optional)</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="sticky-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/recruitment/applicants')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create applicant'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
