import { useRef, useState } from 'react'
import { API_BASE_URL } from '../api/axiosClient'
import Modal from './Modal'

/**
 * Generic export/import CSV toolbar.
 *
 * exportUrl: full path like '/api/employees/export-csv' (downloaded via a real
 *   browser navigation so the auth cookie/token-in-header issue doesn't
 *   apply - instead we fetch with axios and trigger a client-side download).
 * onImport: async (file) => result   where result = { created, updated, errors }
 */
export default function ImportExportBar({ exportFn, exportFilename, onImport }) {
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [showResultModal, setShowResultModal] = useState(false)

  const handleExport = async () => {
    setError('')
    try {
      const res = await exportFn()
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportFilename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Could not export CSV')
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    setError('')
    try {
      const res = await onImport(file)
      setResult(res.data)
      setShowResultModal(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not import CSV')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-outline btn-sm" onClick={handleExport}>Export CSV</button>
        <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? 'Importing…' : 'Import CSV'}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileSelect} />
      </div>

      {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}

      {showResultModal && result && (
        <Modal title="Import Result" onClose={() => setShowResultModal(false)} footer={
          <button className="btn btn-primary" onClick={() => setShowResultModal(false)}>Done</button>
        }>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Created</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{result.created}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Updated</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{result.updated}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Errors</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: result.errors.length ? 'var(--danger)' : 'var(--ink-faint)' }}>{result.errors.length}</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              {result.errors.map((err, i) => (
                <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <strong>Row {err.row}:</strong> {err.error}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
