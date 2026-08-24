import { useEffect, useState } from 'react'
import { Award, Trophy, Sparkles } from 'lucide-react'
import Modal from '../../components/Modal'
import { listRecognitions, createRecognition, getLeaderboard } from '../../api/recognitionApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const CATEGORIES = ['Teamwork', 'Innovation', 'Leadership', 'Customer Focus', 'Above & Beyond']
const CATEGORY_COLORS = {
  'Teamwork': '#1E4FD8', 'Innovation': '#7C4FE0', 'Leadership': '#C6720D',
  'Customer Focus': '#1E8E4E', 'Above & Beyond': '#D4433A',
}

const emptyForm = { given_to: '', category: 'Teamwork', message: '' }

export default function RecognitionWall() {
  const [feed, setFeed] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listRecognitions(), getLeaderboard(), listEmployees()])
      .then(([fRes, lRes, eRes]) => { setFeed(fRes.data); setLeaderboard(lRes.data); setEmployees(eRes.data) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const empName = (id) => employees.find((e) => e.id === id)?.full_name || `#${id}`
  const empInitials = (id) => {
    const name = empName(id)
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createRecognition({ ...form, given_to: Number(form.given_to) })
      setShowModal(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not give kudos'))
    }
  }

  const timeAgo = (iso) => {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Sparkles size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--primary)' }} />Recognition Wall</h1>
          <p>Give a shoutout - peer-to-peer kudos, visible to the whole company.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setError(''); setShowModal(true) }} disabled={employees.length === 0}>
          + Give Kudos
        </button>
      </div>

      {error && !showModal && <div className="error-banner">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div>
          {loading ? (
            <div className="card card-pad">Loading…</div>
          ) : feed.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="icon">✨</div><div className="title">No kudos given yet - be the first!</div></div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feed.map((r) => (
                <div key={r.id} className="card card-pad" style={{ display: 'flex', gap: 12 }}>
                  <div className="photo-frame" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>{empInitials(r.given_to)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5 }}>
                      <strong>{empName(r.given_by)}</strong> gave kudos to <strong>{empName(r.given_to)}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                        padding: '2px 8px', borderRadius: 999,
                        color: CATEGORY_COLORS[r.category], background: `${CATEGORY_COLORS[r.category]}1A`,
                      }}>
                        {r.category}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{timeAgo(r.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: 0 }}>{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Trophy size={16} style={{ color: '#E08A00' }} />
            <strong style={{ fontSize: 14 }}>Top Recognized</strong>
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>No kudos given yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaderboard.map((entry, i) => (
                <div key={entry.employee_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-faint)', width: 16 }}>#{i + 1}</span>
                  <div className="photo-frame" style={{ width: 28, height: 28, fontSize: 11 }}>{empInitials(entry.employee_id)}</div>
                  <span style={{ flex: 1, fontSize: 12.5 }}>{empName(entry.employee_id)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                    <Award size={12} /> {entry.kudos_received}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal
          title="Give Kudos"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Give Kudos</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Recognize</label>
              <select value={form.given_to} onChange={(e) => setForm({ ...form, given_to: e.target.value })} required>
                <option value="">— Select colleague —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                placeholder="What did they do well?"
                required
                style={{ width: '100%', padding: 9, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
