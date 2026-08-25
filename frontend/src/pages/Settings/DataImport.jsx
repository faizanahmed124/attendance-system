import { useEffect, useState } from 'react'
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react'
import { listImportDoctypes, downloadTemplate, exportData, importData } from '../../api/dataImportApi'
import { extractErrorMessage } from '../../utils/errorMessage'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function DataImport() {
  const [doctypes, setDoctypes] = useState([])
  const [selectedKey, setSelectedKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listImportDoctypes().then((res) => {
      setDoctypes(res.data)
      if (res.data.length) setSelectedKey(res.data[0].key)
    }).finally(() => setLoading(false))
  }, [])

  const selected = doctypes.find((d) => d.key === selectedKey)

  const handleDownloadTemplate = async () => {
    setError('')
    try {
      const res = await downloadTemplate(selectedKey)
      downloadBlob(res.data, `${selectedKey}-template.csv`)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not download template'))
    }
  }

  const handleExport = async () => {
    setError('')
    try {
      const res = await exportData(selectedKey)
      downloadBlob(res.data, `${selectedKey}-export.csv`)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not export data'))
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setError('')
    setResult(null)
    try {
      const res = await importData(selectedKey, file)
      setResult(res.data)
      setFile(null)
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not import file'))
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Data Import</h1>
          <p>Bulk import or export any doctype using plain field names - no IDs, ever.</p>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">1</span> Choose what to import</div>
        <div className="form-section-body">
          <div className="field">
            <label>Doctype</label>
            <select value={selectedKey} onChange={(e) => { setSelectedKey(e.target.value); setResult(null); setError('') }}>
              {doctypes.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>

          {selected && (
            <>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8, fontWeight: 600 }}>Fields for {selected.label}:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                {selected.fields.map((f) => (
                  <span key={f.key} style={{
                    fontSize: 11.5, padding: '4px 10px', borderRadius: 999,
                    background: f.required ? 'var(--danger-soft)' : 'var(--surface-soft)',
                    color: f.required ? 'var(--danger)' : 'var(--ink-soft)',
                    fontWeight: f.required ? 700 : 500,
                  }}>
                    {f.label}{f.required && ' *'}
                    {f.type === 'lookup' && <span style={{ opacity: 0.7 }}> (name)</span>}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>
                * required. Fields marked "(name)" are lookups - type the actual name (e.g. the Company's name), never an ID. Matching ignores case and extra spaces.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">2</span> Download</div>
        <div className="form-section-body" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={handleDownloadTemplate}>
            <FileSpreadsheet size={14} style={{ marginRight: 6 }} /> Blank Template
          </button>
          <button className="btn btn-outline" onClick={handleExport}>
            <Download size={14} style={{ marginRight: 6 }} /> Export Current Data
          </button>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">3</span> Upload &amp; Import</div>
        <div className="form-section-body">
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <input type="file" accept=".csv" onChange={(e) => { setFile(e.target.files[0]); setResult(null) }} />
          </div>
          <button className="btn btn-primary" onClick={handleImport} disabled={!file || importing}>
            <Upload size={14} style={{ marginRight: 6 }} /> {importing ? 'Importing…' : 'Import File'}
          </button>

          {result && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, background: 'var(--success-soft, var(--primary-soft))', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success, var(--primary))' }}>{result.created}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Created</div>
                </div>
                <div style={{ flex: 1, background: 'var(--primary-soft)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{result.updated}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Updated</div>
                </div>
                <div style={{ flex: 1, background: 'var(--danger-soft)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>{result.failed}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Failed</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <XCircle size={14} style={{ color: 'var(--danger)' }} /> Rows that failed:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{ fontSize: 12, padding: '8px 12px', background: 'var(--danger-soft)', borderRadius: 6, color: 'var(--danger)' }}>
                        <strong>Row {e.row}:</strong> {e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.failed === 0 && (
                <p style={{ fontSize: 12.5, color: 'var(--success, var(--primary))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> All rows imported successfully.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
