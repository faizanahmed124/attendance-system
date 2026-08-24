import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import StatusPill from '../../components/StatusPill'
import Modal from '../../components/Modal'
import { API_BASE_URL } from '../../api/axiosClient'
import {
  getApplicant, updateApplicant, deleteApplicant, uploadResume,
  addInterview, getJobOpening, convertToEmployee,
} from '../../api/recruitmentApi'

const STATUS_OPTIONS = ['Open', 'Interviewing', 'Offered', 'Hired', 'Rejected']
const INTERVIEW_STATUS_OPTIONS = ['Scheduled', 'Cleared', 'Rejected']

export default function ApplicantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [applicant, setApplicant] = useState(null)
  const [jobOpening, setJobOpening] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [statusForm, setStatusForm] = useState({ status: '', offered_salary: '', offer_date: '', notes: '' })

  const [interviewForm, setInterviewForm] = useState({ round_name: '', scheduled_on: '', interviewer_name: '' })
  const [addingInterview, setAddingInterview] = useState(false)

  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertForm, setConvertForm] = useState({ employee_code: '', date_of_joining: '', employment_type: 'Full-time', branch: '', salary: '' })
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    getApplicant(id)
      .then((res) => {
        setApplicant(res.data)
        setStatusForm({
          status: res.data.status,
          offered_salary: res.data.offered_salary ?? '',
          offer_date: res.data.offer_date || '',
          notes: res.data.notes || '',
        })
        setConvertForm((f) => ({ ...f, salary: res.data.offered_salary ?? res.data.expected_salary ?? '' }))
        return getJobOpening(res.data.job_opening_id)
      })
      .then((jobRes) => setJobOpening(jobRes.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load applicant'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleSaveStatus = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await updateApplicant(id, {
        status: statusForm.status,
        offered_salary: statusForm.offered_salary !== '' ? Number(statusForm.offered_salary) : null,
        offer_date: statusForm.offer_date || null,
        notes: statusForm.notes || null,
      })
      setApplicant(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update applicant')
    } finally {
      setSaving(false)
    }
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const res = await uploadResume(id, file)
      setApplicant(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not upload resume')
    }
  }

  const handleAddInterview = async () => {
    if (!interviewForm.round_name || !interviewForm.scheduled_on) return
    setAddingInterview(true)
    try {
      await addInterview(id, interviewForm)
      setInterviewForm({ round_name: '', scheduled_on: '', interviewer_name: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add interview')
    } finally {
      setAddingInterview(false)
    }
  }

  const handleConvert = async (e) => {
    e.preventDefault()
    setConverting(true)
    setConvertError('')
    try {
      const res = await convertToEmployee(id, {
        ...convertForm,
        salary: convertForm.salary !== '' ? Number(convertForm.salary) : null,
      })
      setShowConvertModal(false)
      navigate(`/employees/${res.data.id}`)
    } catch (err) {
      setConvertError(err.response?.data?.detail || 'Could not convert applicant to employee')
    } finally {
      setConverting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteApplicant(id)
      navigate('/recruitment/applicants')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete applicant')
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !applicant) return <div className="error-banner">{error}</div>
  if (!applicant) return null

  const initials = applicant.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/recruitment/applicants')}>
            ← Back to applicants
          </button>
          <h1>{applicant.full_name}</h1>
          <p>{applicant.email} · Applied for <strong>{jobOpening?.title || `#${applicant.job_opening_id}`}</strong></p>
        </div>
        <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="profile-layout">
        <div className="profile-photo-card">
          <div className="photo-frame">{initials}</div>
          <div className="profile-name">{applicant.full_name}</div>
          <div className="profile-code mono">{applicant.phone || 'No phone'}</div>
          <div style={{ marginTop: 10 }}><StatusPill status={applicant.status} /></div>

          <div className="profile-meta">
            <div className="row"><span>Applied</span><span className="mono">{applicant.applied_date}</span></div>
            <div className="row"><span>Expected salary</span><span className="mono">{applicant.expected_salary ?? '—'}</span></div>
            <div className="row"><span>Offered salary</span><span className="mono">{applicant.offered_salary ?? '—'}</span></div>
          </div>

          {applicant.employee_id ? (
            <Link to={`/employees/${applicant.employee_id}`} className="btn btn-outline btn-sm full-width" style={{ marginTop: 16 }}>
              View employee profile →
            </Link>
          ) : (
            <button
              className="btn btn-primary btn-sm full-width"
              style={{ marginTop: 16 }}
              onClick={() => setShowConvertModal(true)}
            >
              Convert to Employee
            </button>
          )}
        </div>

        <div>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Pipeline Status</div>
            <div className="form-section-body">
              <div className="form-grid">
                <div className="field">
                  <label>Status</label>
                  <select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Offered salary</label>
                  <input type="number" step="0.01" value={statusForm.offered_salary} onChange={(e) => setStatusForm({ ...statusForm, offered_salary: e.target.value })} />
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Offer date</label>
                  <input type="date" value={statusForm.offer_date} onChange={(e) => setStatusForm({ ...statusForm, offer_date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Notes</label>
                  <input value={statusForm.notes} onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleSaveStatus} disabled={saving}>
                {saving ? 'Saving…' : 'Save status'}
              </button>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">2</span> Resume</div>
            <div className="form-section-body">
              {applicant.resume_url ? (
                <div className="doc-row">
                  <div className="doc-icon">▤</div>
                  <div style={{ flex: 1 }}>
                    <div className="doc-name">Resume</div>
                  </div>
                  <a className="btn btn-outline btn-sm" href={`${API_BASE_URL}${applicant.resume_url}`} target="_blank" rel="noreferrer">View</a>
                </div>
              ) : (
                <div style={{ color: 'var(--ink-faint)', fontSize: 13, marginBottom: 10 }}>No resume uploaded yet.</div>
              )}
              <label className="photo-upload-btn" style={{ marginTop: 10 }}>
                {applicant.resume_url ? 'Replace resume' : 'Upload resume'}
                <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleResumeUpload} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">3</span> Interviews</div>
            <div className="form-section-body">
              {applicant.interviews.length === 0 ? (
                <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No interviews scheduled yet.</div>
              ) : (
                applicant.interviews.map((iv) => (
                  <div className="doc-row" key={iv.id}>
                    <div className="doc-icon">◔</div>
                    <div style={{ flex: 1 }}>
                      <div className="doc-name">{iv.round_name} {iv.interviewer_name ? `— ${iv.interviewer_name}` : ''}</div>
                      <div className="doc-date">{new Date(iv.scheduled_on).toLocaleString()}</div>
                    </div>
                    <StatusPill status={iv.status} />
                  </div>
                ))
              )}
              <div className="add-doc-row">
                <input type="text" placeholder="Round name (e.g. HR Round)" value={interviewForm.round_name} onChange={(e) => setInterviewForm({ ...interviewForm, round_name: e.target.value })} />
                <input type="datetime-local" value={interviewForm.scheduled_on} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_on: e.target.value })} />
                <input type="text" placeholder="Interviewer (optional)" value={interviewForm.interviewer_name} onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_name: e.target.value })} />
                <button type="button" className="btn btn-outline btn-sm" onClick={handleAddInterview} disabled={addingInterview}>
                  {addingInterview ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConvertModal && (
        <Modal
          title="Convert to Employee"
          onClose={() => setShowConvertModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowConvertModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConvert} disabled={converting}>
                {converting ? 'Creating…' : 'Create Employee'}
              </button>
            </>
          }
        >
          {convertError && <div className="error-banner">{convertError}</div>}
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
            This creates a new employee using {applicant.full_name}'s details and {jobOpening?.title}'s company/department/designation.
          </p>
          <form onSubmit={handleConvert}>
            <div className="field">
              <label>Employee ID</label>
              <input value={convertForm.employee_code} onChange={(e) => setConvertForm({ ...convertForm, employee_code: e.target.value })} placeholder="EMP-0003" required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Joining date</label>
                <input type="date" value={convertForm.date_of_joining} onChange={(e) => setConvertForm({ ...convertForm, date_of_joining: e.target.value })} required />
              </div>
              <div className="field">
                <label>Employment type</label>
                <select value={convertForm.employment_type} onChange={(e) => setConvertForm({ ...convertForm, employment_type: e.target.value })}>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Branch</label>
                <input value={convertForm.branch} onChange={(e) => setConvertForm({ ...convertForm, branch: e.target.value })} />
              </div>
              <div className="field">
                <label>Salary</label>
                <input type="number" step="0.01" value={convertForm.salary} onChange={(e) => setConvertForm({ ...convertForm, salary: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Delete {applicant.full_name}?</h3></div>
            <div className="modal-body">This applicant and their interview history will be permanently removed.</div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete applicant</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
