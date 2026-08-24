import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download, Play } from 'lucide-react'
import { listReports, runReport } from '../../api/reportsApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const today = new Date().toISOString().slice(0, 10)
const thisMonth = today.slice(0, 7)

export default function ReportViewer() {
  const { reportKey } = useParams()
  const navigate = useNavigate()
  const [meta, setMeta] = useState(null)
  const [rows, setRows] = useState(null)
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState('month') // 'month' | 'range'
  const [month, setMonth] = useState(thisMonth)
  const [fromDate, setFromDate] = useState(thisMonth + '-01')
  const [toDate, setToDate] = useState(today)

  useEffect(() => {
    listReports().then((res) => {
      for (const reports of Object.values(res.data)) {
        const found = reports.find((r) => r.key === reportKey)
        if (found) { setMeta(found); setColumns(found.columns); break }
      }
    }).finally(() => setLoading(false))
  }, [reportKey])

  const handleRun = async () => {
    setRunning(true)
    setError('')
    try {
      const filters = mode === 'month' ? { month } : { from_date: fromDate, to_date: toDate }
      const res = await runReport(reportKey, filters)
      setRows(res.data.rows)
      setColumns(res.data.columns)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not run this report'))
      setRows(null)
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => { if (meta) handleRun() }, [meta]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportCsv = () => {
    if (!rows || rows.length === 0) return
    const header = columns.map((c) => c.label).join(',') + '\n'
    const body = rows.map((row) => columns.map((c) => {
      const val = row[c.key]
      const str = val === null || val === undefined ? '' : String(val)
      return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(',')).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportKey}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (!meta) return <div className="error-banner">Report "{reportKey}" not found.</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/reports')}>
            ← Back to reports
          </button>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
        {rows && rows.length > 0 && (
          <button className="btn btn-outline" onClick={handleExportCsv}>
            <Download size={14} style={{ marginRight: 6 }} /> Export CSV
          </button>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11.5, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>Period</label>
            <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                className="btn btn-sm"
                style={{ borderRadius: 0, border: 'none', background: mode === 'month' ? 'var(--primary)' : 'transparent', color: mode === 'month' ? '#fff' : 'var(--ink)' }}
                onClick={() => setMode('month')}
              >
                Month
              </button>
              <button
                className="btn btn-sm"
                style={{ borderRadius: 0, border: 'none', background: mode === 'range' ? 'var(--primary)' : 'transparent', color: mode === 'range' ? '#fff' : 'var(--ink)' }}
                onClick={() => setMode('range')}
              >
                Date Range
              </button>
            </div>
          </div>

          {mode === 'month' ? (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Month</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </>
          )}

          <button className="btn btn-primary" onClick={handleRun} disabled={running}>
            <Play size={13} style={{ marginRight: 6 }} /> {running ? 'Running…' : 'Run Report'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 10 }}>
          Some reports (e.g. directory, balances) ignore the date filter and always show the current full picture.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {running ? (
        <div className="card card-pad">Running report…</div>
      ) : rows === null ? null : rows.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">□</div><div className="title">No data for this period</div></div></div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => <td key={c.key} className="mono">{row[c.key] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', fontSize: 11.5, color: 'var(--ink-faint)' }}>{rows.length} row(s)</div>
        </div>
      )}
    </div>
  )
}
