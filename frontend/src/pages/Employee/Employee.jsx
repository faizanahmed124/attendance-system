import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import BulkEditModal from '../../components/BulkEditModal'
import { listEmployees, bulkUpdateEmployees, bulkDeleteEmployees } from '../../api/employeeApi'
import { listDepartments } from '../../api/departmentApi'
import { listDesignations } from '../../api/designationApi'

const STATUS_OPTIONS = ['active', 'inactive', 'on_leave', 'resigned']
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Probation']

export default function Employee() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listEmployees(), listDepartments(), listDesignations()])
      .then(([empRes, deptRes, desigRes]) => {
        setEmployees(empRes.data)
        setDepartments(deptRes.data)
        setDesignations(desigRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const deptName = (id) => departments.find((d) => d.id === id)?.name || `#${id}`
  const desigTitle = (id) => designations.find((d) => d.id === id)?.title || `#${id}`

  const bulkFields = [
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
    { name: 'department_id', label: 'Department', type: 'select', options: departments.map((d) => ({ value: d.id, label: d.name })) },
    { name: 'designation_id', label: 'Designation', type: 'select', options: designations.map((d) => ({ value: d.id, label: d.title })) },
    { name: 'employment_type', label: 'Employment Type', type: 'select', options: EMPLOYMENT_TYPES },
    { name: 'branch', label: 'Branch', type: 'text' },
  ]

  const handleBulkEditSubmit = async (fieldName, value) => {
    const isIdField = fieldName.endsWith('_id')
    await bulkUpdateEmployees(selectedIds, { [fieldName]: isIdField ? Number(value) : value })
    setSelectedIds([])
    load()
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected employee(s)? This can't be undone.`)) return
    setError('')
    try {
      await bulkDeleteEmployees(selectedIds)
      setSelectedIds([])
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete selected employees')
    }
  }

  const columns = [
    { key: 'employee_code', label: 'Code', render: (r) => <span className="mono">{r.employee_code}</span> },
    { key: 'full_name', label: 'Name' },
    { key: 'branch', label: 'Branch', render: (r) => r.branch || '—' },
    { key: 'department_id', label: 'Department', render: (r) => deptName(r.department_id) },
    { key: 'designation_id', label: 'Designation', render: (r) => desigTitle(r.designation_id) },
    { key: 'employment_type', label: 'Type', render: (r) => r.employment_type || '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p>Everyone tracked by the attendance system.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/employees/new')}>
            + New Employee
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {selectedIds.length > 0 && (
        <div className="toolbar" style={{ background: 'var(--primary-soft)', padding: '10px 16px', borderRadius: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{selectedIds.length} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowBulkEdit(true)}>Bulk Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>Delete Selected</button>
            <button className="btn btn-outline btn-sm" onClick={() => setSelectedIds([])}>Clear</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          emptyMessage="No employees yet"
          onRowClick={(row) => navigate(`/employees/${row.id}`)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {showBulkEdit && (
        <BulkEditModal
          selectedCount={selectedIds.length}
          fields={bulkFields}
          onSubmit={handleBulkEditSubmit}
          onClose={() => setShowBulkEdit(false)}
        />
      )}
    </div>
  )
}