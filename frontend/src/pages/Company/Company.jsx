import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listCompanies, createCompany } from '../../api/companyApi'

export default function Company() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', abbreviation: '', default_currency: 'PKR', country: 'Pakistan' })

  const load = () => {
    setLoading(true)
    listCompanies().then((res) => setCompanies(res.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createCompany(form)
      setShowModal(false)
      setForm({ name: '', abbreviation: '', default_currency: 'PKR', country: 'Pakistan' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create company')
    }
  }

  const columns = [
    { key: 'name', label: 'Company' },
    { key: 'abbreviation', label: 'Abbr.' },
    { key: 'default_currency', label: 'Currency' },
    { key: 'country', label: 'Country' },
    { key: 'is_active', label: 'Status', render: (r) => <StatusPill status={r.is_active ? 'active' : 'inactive'} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          <p>The legal entities your departments and accounts roll up to.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Company</button>
      </div>

      {loading ? <div className="card card-pad">Loading…</div> : <DataTable columns={columns} data={companies} emptyMessage="No companies yet" />}

      {showModal && (
        <Modal
          title="New Company"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Create Company</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Company name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Abbreviation</label>
                <input value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} required />
              </div>
              <div className="field">
                <label>Currency</label>
                <input value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Country</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
