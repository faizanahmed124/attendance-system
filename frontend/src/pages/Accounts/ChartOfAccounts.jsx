import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, Plus, Folder, FileText } from 'lucide-react'
import Modal from '../../components/Modal'
import { listAccounts, createAccount } from '../../api/accountsApi'
import { listCompanies } from '../../api/companyApi'

const ROOT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']

const emptyForm = {
  account_name: '', company_id: '', root_type: 'Asset', account_type: '',
  parent_account_id: '', is_group: false,
}

function buildNestedTree(accounts) {
  const byId = {}
  accounts.forEach((a) => { byId[a.id] = { ...a, children: [] } })
  const roots = []
  accounts.forEach((a) => {
    const node = byId[a.id]
    if (a.parent_account_id && byId[a.parent_account_id]) {
      byId[a.parent_account_id].children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export default function ChartOfAccounts() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [companies, setCompanies] = useState([])
  const [companyFilter, setCompanyFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [expanded, setExpanded] = useState(new Set())

  const load = (expandRoots = false) => {
    setLoading(true)
    const params = {}
    if (companyFilter) params.company_id = companyFilter
    Promise.all([listAccounts(params), listCompanies()])
      .then(([accRes, compRes]) => {
        setAccounts(accRes.data)
        setCompanies(compRes.data)
        setForm((f) => ({ ...f, company_id: f.company_id || compRes.data[0]?.id || '' }))
        if (expandRoots) {
          const roots = accRes.data.filter((a) => !a.parent_account_id).map((a) => a.id)
          setExpanded(new Set(roots))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => load(true), [companyFilter])

  const tree = buildNestedTree(accounts)
  const groupAccounts = accounts.filter((a) => a.is_group)

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openCreate = (parent = null) => {
    setError('')
    setForm({
      ...emptyForm,
      company_id: parent?.company_id || form.company_id,
      root_type: parent?.root_type || 'Asset',
      parent_account_id: parent?.id || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const newAcc = await createAccount({
        ...form,
        company_id: Number(form.company_id),
        parent_account_id: form.parent_account_id ? Number(form.parent_account_id) : null,
      })
      setShowModal(false)
      if (form.parent_account_id) {
        setExpanded((prev) => new Set(prev).add(Number(form.parent_account_id)))
      }
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create account')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Chart of Accounts</h1>
          <p>Your ledger structure — click a group to expand, hover for + to add a child account.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openCreate(null)} disabled={companies.length === 0}>
          + New Account
        </button>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">All companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : tree.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">□</div><div className="title">No accounts yet</div></div></div>
      ) : (
        <div className="card card-pad coa-tree">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              onAddChild={openCreate}
              onOpenLedger={(acc) => navigate(`/accounts/chart-of-accounts/${acc.id}/ledger`)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={form.parent_account_id ? 'New Child Account' : 'New Account'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Create Account</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Account name</label>
              <input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} required autoFocus />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Company</label>
                <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Root type</label>
                <select value={form.root_type} onChange={(e) => setForm({ ...form, root_type: e.target.value })}>
                  {ROOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Account type (optional)</label>
                <input value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} placeholder="e.g. Bank, Payable, Expense Account" />
              </div>
              <div className="field">
                <label>Parent account</label>
                <select value={form.parent_account_id} onChange={(e) => setForm({ ...form, parent_account_id: e.target.value })}>
                  <option value="">— None (top level) —</option>
                  {groupAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={form.is_group} onChange={(e) => setForm({ ...form, is_group: e.target.checked })} />
              This is a group (can have sub-accounts, not directly postable)
            </label>
          </form>
        </Modal>
      )}
    </div>
  )
}

function TreeNode({ node, depth, expanded, onToggle, onAddChild, onOpenLedger }) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)

  return (
    <div>
      <div
        className="coa-node-row"
        style={{ paddingLeft: 10 + depth * 20 }}
        onClick={() => (node.is_group ? onToggle(node.id) : onOpenLedger(node))}
      >
        <span className="coa-toggle">
          {hasChildren || node.is_group ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : <span style={{ width: 14, display: 'inline-block' }} />}
        </span>
        <span className="coa-node-icon">{node.is_group ? <Folder size={14} /> : <FileText size={13} />}</span>
        <span className={node.is_group ? 'coa-node-name coa-node-name-group' : 'coa-node-name'}>{node.account_name}</span>
        {node.account_type && <span className="coa-node-badge">{node.account_type}</span>}
        <span className="coa-node-meta">{node.root_type}</span>
        <span className="coa-node-meta mono">{node.currency}</span>
        {node.is_group && (
          <button
            className="coa-add-btn"
            onClick={(e) => { e.stopPropagation(); onAddChild(node) }}
            title={`Add account under ${node.account_name}`}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="coa-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onOpenLedger={onOpenLedger}
            />
          ))}
        </div>
      )}
    </div>
  )
}