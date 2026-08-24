import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import { listApplicants } from '../../api/recruitmentApi'
import { listJobOpenings } from '../../api/recruitmentApi'

const STATUS_OPTIONS = ['Open', 'Interviewing', 'Offered', 'Hired', 'Rejected']

export default function Applicants() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const jobOpeningFilter = searchParams.get('job_opening_id') || ''

  const [applicants, setApplicants] = useState([])
  const [jobOpenings, setJobOpenings] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const jobTitle = (id) => jobOpenings.find((j) => j.id === id)?.title || `#${id}`

  const load = () => {
    setLoading(true)
    const params = {}
    if (jobOpeningFilter) params.job_opening_id = jobOpeningFilter
    if (statusFilter) params.status = statusFilter

    Promise.all([listApplicants(params), listJobOpenings()])
      .then(([appRes, jobRes]) => {
        setApplicants(appRes.data)
        setJobOpenings(jobRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [jobOpeningFilter, statusFilter])

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'job_opening_id', label: 'Job Opening', render: (r) => jobTitle(r.job_opening_id) },
    { key: 'applied_date', label: 'Applied', render: (r) => <span className="mono">{r.applied_date}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Applicants</h1>
          <p>Everyone who has applied across your job openings.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/recruitment/applicants/new')}>
          + New Applicant
        </button>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <select value={jobOpeningFilter} onChange={(e) => setSearchParams(e.target.value ? { job_opening_id: e.target.value } : {})}>
            <option value="">All job openings</option>
            {jobOpenings.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={applicants}
          emptyMessage="No applicants match these filters"
          onRowClick={(row) => navigate(`/recruitment/applicants/${row.id}`)}
        />
      )}
    </div>
  )
}
