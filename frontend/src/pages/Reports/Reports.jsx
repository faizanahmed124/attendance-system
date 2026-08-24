import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileBarChart2, Search } from 'lucide-react'
import { listReports } from '../../api/reportsApi'

const MODULE_LABELS = {
  attendance: 'Attendance', hr: 'HR', payroll: 'Payroll', loan: 'Loan Management',
  leave: 'Leave Management', recruitment: 'Recruitment', accounts: 'Accounts',
  helpdesk: 'Help Desk', recognition: 'Recognition',
}

export default function Reports() {
  const navigate = useNavigate()
  const [byModule, setByModule] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    listReports().then((res) => setByModule(res.data)).finally(() => setLoading(false))
  }, [])

  const filteredModules = Object.entries(byModule)
    .map(([mod, reports]) => [
      mod,
      reports.filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase())),
    ])
    .filter(([, reports]) => reports.length > 0)

  const totalCount = Object.values(byModule).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>{totalCount} reports across every module - click any to run it.</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reports…"
          style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid var(--border)', borderRadius: 8 }}
        />
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : filteredModules.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">□</div><div className="title">No reports match "{search}"</div></div></div>
      ) : (
        filteredModules.map(([mod, reports]) => (
          <div key={mod} style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13.5, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12 }}>
              {MODULE_LABELS[mod] || mod}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {reports.map((r) => (
                <div
                  key={r.key}
                  className="card card-pad"
                  style={{ cursor: 'pointer', display: 'flex', gap: 12 }}
                  onClick={() => navigate(`/reports/${r.key}`)}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileBarChart2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{r.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
