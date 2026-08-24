import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../api/notificationApi'

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const refreshCount = () => {
    getUnreadCount().then((res) => setUnreadCount(res.data.count)).catch(() => {})
  }

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      setLoading(true)
      listNotifications().then((res) => setNotifications(res.data)).finally(() => setLoading(false))
    }
  }

  const handleClick = async (n) => {
    if (!n.is_read) {
      try { await markAsRead(n.id); refreshCount() } catch (e) { /* ignore */ }
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const handleMarkAllRead = async (e) => {
    e.stopPropagation()
    try {
      await markAllAsRead()
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) { /* ignore */ }
  }

  const timeAgo = (iso) => {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, color: 'var(--ink-soft)' }}
        className="notif-bell-btn"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, minWidth: 15, height: 15, borderRadius: 999,
            background: 'var(--danger)', color: '#fff', fontSize: 9.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0, width: 340, maxHeight: 420, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: 'var(--shadow-md)', zIndex: 80,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)' }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)' }}>No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: '11px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: n.is_read ? 'transparent' : 'var(--primary-soft)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{n.title}</span>
                  {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />}
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '4px 0' }}>{n.message}</p>
                <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{timeAgo(n.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
