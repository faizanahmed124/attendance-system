import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { listJournalEntries, createJournalEntry, deleteJournalEntry } from '../../api/accountsApi'
import { listAccounts } from '../../api/accountsApi'
import { listCompanies } from '../../api/companyApi'
import { listDepartments } from '../../api/departmentApi'

const emptyLine = { account_id: '', department_id: '', debit: '', credit: '', remarks: '' }

export default function JournalEntries() {
  const [entries, setEntries] = useState([])
  const [accounts, setAccounts] = useState([])
  const [companies, setCompanies] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const [form, setForm] = useState({ company_id: '', entry_date: '', reference_number: '', user_remark: '' })
  const [lines, setLines] = useState([{ ...emptyLine }, { ...emptyLine }])

  const load = () => {
    setLoading(true)
    Promise.all([listJournalEntries(), listAccounts(), listCompanies(), listDepartments()])
      .then(([entRes, accRes, compRes, deptRes]) => {
        setEntries(entRes.data)
        setAccounts(accRes.data.filter((a) => !a.is_group))
        setCompanies(compRes.data)
        setDepartments(deptRes.data)
        setForm((f) => ({ ...f, company_id: f.company_id || compRes.data[0]?.id || '' }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const accountName = (id) => accounts.find((a) => a.id === id)?.account_name || `#${id}`
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)
  const balanced = totalDebit === totalCredit && totalDebit > 0

  const updateLine = (i, field, value) => {
    const next = [...lines]
    next[i] = { ...next[i], [field]: value }
    setLines(next)
  }
  const addLine = () => setLines([...lines, { ...emptyLine }])
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createJournalEntry({
        ...form,
        company_id: Number(form.company_id),
        lines: lines
          .filter((l) => l.account_id && (l.debit || l.credit))
          .map((l) => ({
            account_id: Number(l.account_id),
            department_id: l.department_id ? Number(l.department_id) : null,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            remarks: l.remarks || null,
          })),
      })
      setShowModal(false)
      setForm({ ...form, entry_date: '', reference_number: '', user_remark: '' })
      setLines([{ ...emptyLine }, { ...emptyLine }])
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create journal entry')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return
    try {
      await deleteJournalEntry(id)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete entry')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Journal Entries</h1>
          <p>Direct double-entry postings. Total debit must equal total credit.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={accounts.length === 0}>
          + New Journal Entry
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">□</div><div className="title">No journal entries yet</div></div></div>
      ) : (
        <div className="card">
          {entries.map((entry) => (
            <div key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div>
                  <strong>{entry.reference_number || `Journal Entry #${entry.id}`}</strong>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{entry.entry_date} · {entry.user_remark || 'No remarks'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span className="mono" style={{ fontWeight: 700 }}>{entry.total_debit.toLocaleString()}</span>
                  <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}>Delete</button>
                </div>
              </div>
              {expandedId === entry.id && (
                <table style={{ marginBottom: 10 }}>
                  <thead><tr><th>Account</th><th>Department</th><th>Debit</th><th>Credit</th><th>Remarks</th></tr></thead>
                  <tbody>
                    {entry.lines.map((l) => (
                      <tr key={l.id}>
                        <td>{accountName(l.account_id)}</td>
                        <td>{departments.find((d) => d.id === l.department_id)?.name || '—'}</td>
                        <td className="mono">{l.debit ? l.debit.toLocaleString() : '—'}</td>
                        <td className="mono">{l.credit ? l.credit.toLocaleString() : '—'}</td>
                        <td>{l.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title="New Journal Entry"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={!balanced}>
                Create Entry {!balanced && '(must balance)'}
              </button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Company</label>
                <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Reference (optional)</label>
                <input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
              </div>
              <div className="field">
                <label>Remarks (optional)</label>
                <input value={form.user_remark} onChange={(e) => setForm({ ...form, user_remark: e.target.value })} />
              </div>
            </div>

            <div className="field">
              <label>Lines</label>
            </div>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={line.account_id} onChange={(e) => updateLine(i, 'account_id', e.target.value)} style={{ flex: 2, minWidth: 140, padding: 8, border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }}>
                  <option value="">Account…</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
                <select value={line.department_id} onChange={(e) => updateLine(i, 'department_id', e.target.value)} style={{ flex: 1, minWidth: 110, padding: 8, border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }}>
                  <option value="">Dept…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="number" placeholder="Debit" value={line.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)} style={{ width: 90, padding: 8, border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }} />
                <input type="number" placeholder="Credit" value={line.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)} style={{ width: 90, padding: 8, border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLine(i)}>×</button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addLine}>+ Add line</button>

            <div style={{ marginTop: 14, display: 'flex', gap: 20, fontSize: 13 }}>
              <span>Debit: <strong className="mono">{totalDebit.toLocaleString()}</strong></span>
              <span>Credit: <strong className="mono">{totalCredit.toLocaleString()}</strong></span>
              {!balanced && <span style={{ color: 'var(--danger)' }}>Not balanced</span>}
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
