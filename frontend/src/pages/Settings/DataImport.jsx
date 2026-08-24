import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, FileUp, Download } from 'lucide-react'
import {
  listImportDoctypes, getDoctypeFields, downloadTemplate, exportDoctypeData, importDoctypeData,
} from '../../api/dataImportApi'

function downloadBlob(data, filename) {
  const blob = new Blob([data], { type: 'text/csv' })
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
  const navigate = useNavigate()
  const [doctypes, setDoctypes] = useState([])
  const [selectedDoctype, setSelectedDoctype] = useState('')
  const [fields, setFields] = useState([])
  const [selectedFields, setSelectedFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingFields, setLoadingFields] = useState(false)
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listImportDoctypes().then((res) => setDoctypes(res.data)).finally(() => setLoading(false))
  }, [])

  const handleSelectDoctype = (key) => {
    setSelectedDoctype(key)
    setResult(null)
    setError('')
    setFile(null)
    if (!key) {
      setFields([])
      setSelectedFields([])
      return
    }
    setLoadingFields(true)
    getDoctypeFields(key).then((res) => {
      setFields(res.data)
      setSelectedFields(res.data.map((f) => f.name)) // all selected by default
    }).finally(() => setLoadingFields(false))
  }

  const toggleField = (name, required) => {
    if (required) return // required fields can't be unchecked
    setSelectedFields((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    )
  }

  const handleDownloadTemplate = async () => {
    setError('')
    try {
      const res = await downloadTemplate(selectedDoctype, selectedFields)
      downloadBlob(res.data, `${selectedDoctype}_template.csv`)
    } catch (err) {
      setError('Could not download template')
    }
  }

  const handleExportCurrent = async () => {
    setError('')
    try {
      const res = await exportDoctypeData(selectedDoctype, selectedFields)
      downloadBlob(res.data, `${selectedDoctype}.csv`)
    } catch (err) {
      setError('Could not export current data')
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setError('')
    setResult(null)
    try {
      const res = await importDoctypeData(selectedDoctype, file)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not import file')
    } finally {
      setImporting(false)
    }
  }

  const doctypeLabel = doctypes.find((d) => d.key === selectedDoctype)?.label

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/modules/settings')}>
            ← Back to Settings
          </button>
          <h1>Data Import</h1>
          <p>Pick a doctype, choose fields, download a template, fill it in, and upload it back.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-section">
        <div className="form-section-header"><span className="num">1</span> Choose Doctype</div>
        <div className="form-section-body">
          {loading ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading doctypes…</div>
          ) : (
            <div className="field" style={{ maxWidth: 360 }}>
              <label>Document Type</label>
              <select value={selectedDoctype} onChange={(e) => handleSelectDoctype(e.target.value)}>
                <option value="">— Select a doctype —</option>
                {doctypes.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {selectedDoctype && (
        <div className="form-section">
          <div className="form-section-header"><span className="num">2</span> Select Fields</div>
          <div className="form-section-body">
            {loadingFields ? (
              <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading fields…</div>
            ) : (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
                  Required fields (marked *) are always included. Uncheck any optional field you don't need.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {fields.map((f) => (
                    <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 8px', borderRadius: 6, background: selectedFields.includes(f.name) ? 'var(--surface-soft)' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(f.name)}
                        onChange={() => toggleField(f.name, f.required)}
                        disabled={f.required}
                      />
                      {f.label}{f.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginLeft: 'auto' }}>{f.type}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedDoctype && selectedFields.length > 0 && (
        <div className="form-section">
          <div className="form-section-header"><span className="num">3</span> Download</div>
          <div className="form-section-body">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={handleDownloadTemplate}>
                <FileDown size={14} /> Download Blank Template
              </button>
              <button className="btn btn-outline" onClick={handleExportCurrent}>
                <Download size={14} /> Download Current {doctypeLabel} Data
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 10 }}>
              Fill in the template with your data (keep the header row as-is), then upload it below.
            </p>
          </div>
        </div>
      )}

      {selectedDoctype && (
        <div className="form-section">
          <div className="form-section-header"><span className="num">4</span> Upload &amp; Import</div>
          <div className="form-section-body">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="photo-upload-btn">
                <FileUp size={13} style={{ marginRight: 4 }} />
                {file ? file.name : 'Choose CSV file'}
                <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
              </label>
              <button className="btn btn-primary" onClick={handleImport} disabled={!file || importing}>
                {importing ? 'Importing…' : 'Start Import'}
              </button>
            </div>

            {result && (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Created</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{result.created}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Updated</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{result.updated}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Errors</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: result.errors.length ? 'var(--danger)' : 'var(--ink-faint)' }}>{result.errors.length}</div>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                    {result.errors.map((err, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <strong>Row {err.row}:</strong> {err.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
