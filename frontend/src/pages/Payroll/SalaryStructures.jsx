import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import { listSalaryStructures, deleteSalaryStructure } from '../../api/salaryStructureApi'
import { listCompanies } from '../../api/companyApi'
import { extractErrorMessage } from '../../utils/errorMessage'

export default function SalaryStructures() {
  const navigate = useNavigate()
  const [structures, setStructures] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listSalaryStructures(), listCompanies()])
      .then(([sRes, cRes]) => { setStructures(sRes.data); setCompanies(cRes.data) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const companyName = (id) => companies.find((c) => c.id === id)?.name || `#${id}`

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return
    setError('')
    try {
      await deleteSalaryStructure(s.id)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete structure'))
    }
  }

  const columns = [
    { key: 'name', label: 'Structure' },
    { key: 'company_id', label: 'Company', render: (r) => companyName(r.company_id) },
    { key: 'components', label: 'Components', render: (r) => `${r.components.length} component(s)` },
    { key: 'is_active', label: 'Status', render: (r) => <StatusPill status={r.is_active ? 'active' : 'inactive'} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/payroll/salary-structures/${r.id}/edit`) }}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(r) }}>Delete</button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Salary Structures</h1>
          <p>Templates made up of Salary Components - assign one to each employee.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/payroll/salary-structures/new')}>
          + New Structure
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable columns={columns} data={structures} emptyMessage="No salary structures yet" />
      )}
    </div>
  )
}
