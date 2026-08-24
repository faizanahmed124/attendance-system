import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listDesignations, createDesignation } from '../../api/designationApi'

export default function Designation() {
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '' })

  const load = () => {
    setLoading(true)
    listDesignations().then((res) => setDesignations(res.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createDesignation(form)
      setShowModal(false)
      setForm({ title: '', description: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create designation')
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description', render: (r) => r.description || '—' },
    { key: 'is_active', label: 'Status', render: (r) => <StatusPill status={r.is_active ? 'active' : 'inactive'} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Designations</h1>
          <p>Job titles employees are assigned to.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Designation</button>
      </div>

      {loading ? <div className="card card-pad">Loading…</div> : <DataTable columns={columns} data={designations} emptyMessage="No designations yet" />}

      {showModal && (
        <Modal
          title="New Designation"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Create Designation</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
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
