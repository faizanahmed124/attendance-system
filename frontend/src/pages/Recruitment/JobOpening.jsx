import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listJobOpenings, createJobOpening } from '../../api/recruitmentApi'
import { listCompanies } from '../../api/companyApi'
import { listDepartments } from '../../api/departmentApi'
import { listDesignations } from '../../api/designationApi'

export default function JobOpening() {
  const navigate = useNavigate()
  const [openings, setOpenings] = useState([])
  const [companies, setCompanies] = useState([])
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', company_id: '', department_id: '', designation_id: '',
    positions: 1, description: '',
  })

  const load = () => {
    setLoading(true)
    Promise.all([listJobOpenings(), listCompanies(), listDepartments(), listDesignations()])
      .then(([openRes, compRes, deptRes, desigRes]) => {
        setOpenings(openRes.data)
        setCompanies(compRes.data)
        setDepartments(deptRes.data)
        setDesignations(desigRes.data)
        setForm((f) => ({
          ...f,
          company_id: f.company_id || compRes.data[0]?.id || '',
          department_id: f.department_id || deptRes.data[0]?.id || '',
          designation_id: f.designation_id || desigRes.data[0]?.id || '',
        }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const deptName = (id) => departments.find((d) => d.id === id)?.name || `#${id}`
  const desigTitle = (id) => designations.find((d) => d.id === id)?.title || `#${id}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createJobOpening({
        ...form,
        company_id: Number(form.company_id),
        department_id: Number(form.department_id),
        designation_id: Number(form.designation_id),
        positions: Number(form.positions),
      })
      setShowModal(false)
      setForm({ ...form, title: '', description: '', positions: 1 })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create job opening')
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'department_id', label: 'Department', render: (r) => deptName(r.department_id) },
    { key: 'designation_id', label: 'Designation', render: (r) => desigTitle(r.designation_id) },
    { key: 'positions', label: 'Positions' },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Job Openings</h1>
          <p>Positions you're currently hiring for.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={companies.length === 0}>
          + New Job Opening
        </button>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={openings}
          emptyMessage="No job openings yet"
          onRowClick={(row) => navigate(`/recruitment/applicants?job_opening_id=${row.id}`)}
        />
      )}

      {showModal && (
        <Modal
          title="New Job Opening"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Create Job Opening</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Backend Developer" required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Company</label>
                <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Positions</label>
                <input type="number" min="1" value={form.positions} onChange={(e) => setForm({ ...form, positions: e.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Department</label>
                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Designation</label>
                <select value={form.designation_id} onChange={(e) => setForm({ ...form, designation_id: e.target.value })}>
                  {designations.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
