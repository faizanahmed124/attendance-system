import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listBiometricDevices, createBiometricDevice, updateBiometricDevice, deleteBiometricDevice, syncBiometricDeviceNow } from '../../api/integrationApi'

const emptyForm = {
  device_name: '', ip_address: '', port: 4370, location: '',
  purpose: 'Check-in', device_type: '', status: 'Active', notes: '',
}

export default function BiometricDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [syncingId, setSyncingId] = useState(null)
  const [syncMessage, setSyncMessage] = useState('')
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    listBiometricDevices().then((res) => setDevices(res.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (device) => {
    setEditingId(device.id)
    setForm({
      device_name: device.device_name, ip_address: device.ip_address, port: device.port,
      location: device.location || '', purpose: device.purpose, device_type: device.device_type || '',
      status: device.status, notes: device.notes || '',
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
        await updateBiometricDevice(editingId, payload)
      } else {
        await createBiometricDevice(payload)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save device')
    }
  }

  const toggleStatus = async (device) => {
    try {
      await updateBiometricDevice(device.id, { status: device.status === 'Active' ? 'Inactive' : 'Active' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update status')
    }
  }

  const handleDelete = async (device) => {
    if (!window.confirm(`Delete "${device.device_name}"?`)) return
    try {
      await deleteBiometricDevice(device.id)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete device')
    }
  }

  const handleSyncNow = async (device) => {
    setSyncingId(device.id)
    setSyncMessage('')
    setError('')
    try {
      const res = await syncBiometricDeviceNow(device.id)
      if (res.data.error) {
        setError(`${device.device_name}: ${res.data.error}`)
      } else {
        setSyncMessage(
          `${device.device_name}: pulled ${res.data.pulled}, created ${res.data.created} new check-in(s)` +
          (res.data.skipped_duplicate ? `, ${res.data.skipped_duplicate} already synced` : '') +
          (res.data.skipped_unmatched_employee ? `, ${res.data.skipped_unmatched_employee} unmatched employee(s)` : '')
        )
      }
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not sync device')
    } finally {
      setSyncingId(null)
    }
  }

  const columns = [
    { key: 'device_name', label: 'Device Name' },
    { key: 'ip_address', label: 'IP : Port', render: (r) => <span className="mono">{r.ip_address}:{r.port}</span> },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
    { key: 'purpose', label: 'Purpose', render: (r) => <StatusPill status={r.purpose === 'Check-in' ? 'Present' : 'On Leave'} /> },
    { key: 'last_sync_at', label: 'Last Synced', render: (r) => <span className="mono" style={{ fontSize: 11.5 }}>{r.last_sync_at ? new Date(r.last_sync_at).toLocaleString() : 'Never'}</span> },
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
          <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); handleSyncNow(r) }} disabled={syncingId === r.id}>
            {syncingId === r.id ? 'Syncing…' : 'Sync Now'}
          </button>
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
          <h1>Biometric Devices</h1>
          <p>Fingerprint/face-scan machines. Check-in and check-out are always separate devices.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Device</button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {syncMessage && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>{syncMessage}</div>}

      {loading ? <div className="card card-pad">Loading…</div> : <DataTable columns={columns} data={devices} emptyMessage="No biometric devices configured yet" />}

      {showModal && (
        <Modal
          title={editingId ? 'Edit Device' : 'New Biometric Device'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? 'Save changes' : 'Create Device'}</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Device name</label>
              <input value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })} placeholder="e.g. Main Gate Check-in" required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>IP address</label>
                <input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.50" required />
              </div>
              <div className="field">
                <label>Port</label>
                <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Purpose</label>
                <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                  <option value="Check-in">Check-in</option>
                  <option value="Check-out">Check-out</option>
                </select>
              </div>
              <div className="field">
                <label>Device type / brand</label>
                <input value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })} placeholder="e.g. ZKTeco" />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main Gate" />
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
