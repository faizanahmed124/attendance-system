import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, GitBranch, ChevronRight, ChevronDown, Plus, Pencil, Folder, FileText } from 'lucide-react'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import BulkEditModal from '../../components/BulkEditModal'
import { listDepartments, bulkUpdateDepartments, bulkDeleteDepartments, deleteDepartment } from '../../api/departmentApi'
import { listCompanies } from '../../api/companyApi'
import { extractErrorMessage } from '../../utils/errorMessage'

function buildNestedTree(departments) {
  const byId = {}
  departments.forEach((d) => { byId[d.id] = { ...d, children: [] } })
  const roots = []
  departments.forEach((d) => {
    const node = byId[d.id]
    if (d.parent_department_id && byId[d.parent_department_id]) {
      byId[d.parent_department_id].children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export default function Department() {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('list') // 'list' | 'tree'
  const [expanded, setExpanded] = useState(new Set())
  const [selectedIds, setSelectedIds] = useState([])
  const [showBulkEdit, setShowBulkEdit] = useState(false)

  const load = (expandRoots = false) => {
    setLoading(true)
    Promise.all([listDepartments(), listCompanies()])
      .then(([deptRes, compRes]) => {
        setDepartments(deptRes.data)
        setCompanies(compRes.data)
        if (expandRoots) {
          const roots = deptRes.data.filter((d) => !d.parent_department_id).map((d) => d.id)
          setExpanded(new Set(roots))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => load(true), [])

  const companyName = (id) => companies.find((c) => c.id === id)?.name || `#${id}`
  const tree = buildNestedTree(departments)

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const bulkFields = [
    { name: 'company_id', label: 'Company', type: 'select', options: companies.map((c) => ({ value: c.id, label: c.name })) },
    { name: 'is_active', label: 'Active', type: 'select', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ]

  const handleBulkEditSubmit = async (fieldName, value) => {
    let coerced = value
    if (fieldName === 'company_id') coerced = Number(value)
    if (fieldName === 'is_active') coerced = value === 'true'
    await bulkUpdateDepartments(selectedIds, { [fieldName]: coerced })
    setSelectedIds([])
    load()
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected department(s)?`)) return
    setError('')
    try {
      await bulkDeleteDepartments(selectedIds)
      setSelectedIds([])
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete selected departments'))
    }
  }

  const handleDeleteOne = async (dept) => {
    if (!window.confirm(`Delete "${dept.name}"?`)) return
    setError('')
    try {
      await deleteDepartment(dept.id)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete department'))
    }
  }

  const columns = [
    { key: 'name', label: 'Department' },
    { key: 'company_id', label: 'Company', render: (r) => companyName(r.company_id) },
    { key: 'is_group', label: 'Group', render: (r) => r.is_group ? 'Yes' : 'No' },
    { key: 'is_active', label: 'Status', render: (r) => <StatusPill status={r.is_active ? 'active' : 'inactive'} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <p>Group employees by function within each company - supports parent/child hierarchy.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setView('list')}
              className="btn btn-sm"
              style={{ borderRadius: 0, border: 'none', background: view === 'list' ? 'var(--primary)' : 'transparent', color: view === 'list' ? '#fff' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setView('tree')}
              className="btn btn-sm"
              style={{ borderRadius: 0, border: 'none', background: view === 'tree' ? 'var(--primary)' : 'transparent', color: view === 'tree' ? '#fff' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <GitBranch size={14} /> Tree View
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/departments/new')} disabled={companies.length === 0}>
            + New Department
          </button>
        </div>
      </div>

      {companies.length === 0 && !loading && (
        <div className="error-banner">Create a company first before adding departments.</div>
      )}
      {error && <div className="error-banner">{error}</div>}

      {view === 'list' && selectedIds.length > 0 && (
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
      ) : view === 'list' ? (
        <DataTable
          columns={columns}
          data={departments}
          emptyMessage="No departments yet"
          onRowClick={(row) => navigate(`/departments/${row.id}/edit`)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      ) : tree.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">□</div><div className="title">No departments yet</div></div></div>
      ) : (
        <div className="card card-pad coa-tree">
          {tree.map((node) => (
            <DeptTreeNode
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              companyName={companyName}
              onAddChild={(parent) => navigate(`/departments/new?parent=${parent.id}`)}
              onEdit={(dept) => navigate(`/departments/${dept.id}/edit`)}
              onDelete={handleDeleteOne}
            />
          ))}
        </div>
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

function DeptTreeNode({ node, depth, expanded, onToggle, companyName, onAddChild, onEdit, onDelete }) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)

  return (
    <div>
      <div className="coa-node-row" style={{ paddingLeft: 10 + depth * 20 }} onClick={() => (node.is_group ? onToggle(node.id) : onEdit(node))}>
        <span className="coa-toggle">
          {hasChildren || node.is_group ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14, display: 'inline-block' }} />}
        </span>
        <span className="coa-node-icon">{node.is_group ? <Folder size={14} /> : <FileText size={13} />}</span>
        <span className={node.is_group ? 'coa-node-name coa-node-name-group' : 'coa-node-name'}>
          {node.name}
          {!node.is_active && <span className="coa-node-flag">inactive</span>}
        </span>
        <span className="coa-node-meta">{companyName(node.company_id)}</span>
        <button className="coa-add-btn coa-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(node) }} title="Edit">
          <Pencil size={12} />
        </button>
        <button className="coa-add-btn" onClick={(e) => { e.stopPropagation(); onDelete(node) }} title="Delete" style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
          ×
        </button>
        {node.is_group && (
          <button className="coa-add-btn" onClick={(e) => { e.stopPropagation(); onAddChild(node) }} title={`Add department under ${node.name}`}>
            <Plus size={13} />
          </button>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="coa-children">
          {node.children.map((child) => (
            <DeptTreeNode key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} companyName={companyName} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
