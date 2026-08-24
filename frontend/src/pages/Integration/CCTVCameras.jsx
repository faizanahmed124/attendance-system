import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listCCTVCameras, createCCTVCamera, updateCCTVCamera, deleteCCTVCamera } from '../../api/integrationApi'

const emptyForm = { camera_name: '', ip_address: '', port: 554, location: '', stream_url: '', status: 'Active', notes: '' }

export default function CCTVCameras() {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    listCCTVCameras().then((res) => setCameras(res.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (camera) => {
    setEditingId(camera.id)
    setForm({
      camera_name: camera.camera_name, ip_address: camera.ip_address, port: camera.port,
      location: camera.location || '', stream_url: camera.stream_url || '', status: camera.status, notes: camera.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form, port: Number(form.port) }
      if (editingId) {
        await updateCCTVCamera(editingId, payload)
      } else {
        await createCCTVCamera(payload)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save camera')
    }
  }

  const toggleStatus = async (camera) => {
    try {
      await updateCCTVCamera(camera.id, { status: camera.status === 'Active' ? 'Inactive' : 'Active' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update status')
    }
  }

  const handleDelete = async (camera) => {
    if (!window.confirm(`Delete "${camera.camera_name}"?`)) return
    try {
      await deleteCCTVCamera(camera.id)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete camera')
    }
  }

  const columns = [
    { key: 'camera_name', label: 'Camera Name' },
    { key: 'ip_address', label: 'IP : Port', render: (r) => <span className="mono">{r.ip_address}:{r.port}</span> },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
    { key: 'stream_url', label: 'Stream URL', render: (r) => r.stream_url ? <span className="mono" style={{ fontSize: 11.5 }}>{r.stream_url}</span> : '—' },
    {
      key: 'status', label: 'Status',
      render: (r) => (
        <span onClick={(e) => { e.stopPropagation(); toggleStatus(r) }} style={{ cursor: 'pointer' }}>
          <StatusPill status={r.status === 'Active' ? 'active' : 'inactive'} />
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(r) }}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(r) }}>Delete</button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>CCTV Cameras</h1>
          <p>Camera connection details for site monitoring.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Camera</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? <div className="card card-pad">Loading…</div> : <DataTable columns={columns} data={cameras} emptyMessage="No cameras configured yet" />}

      {showModal && (
        <Modal
          title={editingId ? 'Edit Camera' : 'New CCTV Camera'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? 'Save changes' : 'Create Camera'}</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Camera name</label>
              <input value={form.camera_name} onChange={(e) => setForm({ ...form, camera_name: e.target.value })} placeholder="e.g. Entrance Cam 1" required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>IP address</label>
                <input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.100" required />
              </div>
              <div className="field">
                <label>Port</label>
                <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Stream URL (optional)</label>
              <input value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} placeholder="rtsp://192.168.1.100:554/stream1" />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main Entrance" />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
