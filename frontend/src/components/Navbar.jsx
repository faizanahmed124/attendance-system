import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { globalSearch } from '../api/searchApi'
import { MODULE_OVERVIEWS } from '../config/moduleOverviews'
import NotificationBell from './NotificationBell'

const titles = {
  '/': 'Dashboard',
  '/companies': 'Companies',
  '/departments': 'Departments',
  '/designations': 'Designations',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/check-in': 'Check-in / Check-out',
  '/check-in-logs': 'Check-in Logs',
  '/settings/permissions': 'Permissions',
  '/settings/system': 'System Settings',
  '/settings/data-import': 'Data Import',
  '/users': 'Users',
  '/recruitment/job-openings': 'Job Openings',
  '/recruitment/applicants': 'Applicants',
  '/recruitment/applicants/new': 'New Applicant',
  '/integration/biometric-devices': 'Biometric Devices',
  '/integration/cctv-cameras': 'CCTV Cameras',
  '/attendance/shift-types': 'Shift Types',
  '/attendance/shift-types/new': 'New Shift Type',
  '/attendance/shift-assignments': 'Shift Assignments',
  '/accounts/chart-of-accounts': 'Chart of Accounts',
  '/accounts/journal-entries': 'Journal Entries',
  '/accounts/expense-claims': 'Expense Claims',
  '/accounts/salary-postings': 'Salary Postings',
  '/payroll/entries': 'Payroll Entries',
  '/payroll/salary-slips': 'Salary Slips',
}

const typeIcon = {
  employee: 'E', department: 'D', company: 'C', designation: 'T',
  job_opening: 'J', applicant: 'A',
}

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const path = window.location.pathname
  let title = titles[path]
  if (!title) {
    if (path.startsWith('/modules/')) {
      const key = path.split('/')[2]
      title = MODULE_OVERVIEWS[key]?.title || 'Module'
    } else if (path.startsWith('/attendance/')) {
      title = 'Attendance Record'
    } else if (path.startsWith('/employees/')) {
      title = 'Employee Profile'
    } else if (path.startsWith('/recruitment/applicants/')) {
      title = 'Applicant Profile'
    } else if (path.startsWith('/payroll/entries/')) {
      title = 'Payroll Entry'
    } else if (path.startsWith('/payroll/salary-slips/')) {
      title = 'Salary Slip'
    } else if (path.startsWith('/users/')) {
      title = 'User Profile'
    } else {
      title = 'Attendance System'
    }
  }

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const searchRef = useRef(null)
  const userMenuRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e) => {
    const value = e.target.value
    setQuery(value)
    clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      setSearchOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await globalSearch(value.trim())
        setResults(res.data.results)
        setSearchOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleSelect = (item) => {
    setSearchOpen(false)
    setQuery('')
    navigate(item.url)
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="topbar">
      <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <div className="topbar-title">{title}</div>

      <div className="global-search" ref={searchRef}>
        <span className="search-icon">⌕</span>
        <input
          placeholder="Search employees, departments, companies…"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setSearchOpen(true)}
        />
        {searchOpen && (
          <div className="search-dropdown">
            {loading && <div className="search-empty">Searching…</div>}
            {!loading && results.length === 0 && <div className="search-empty">No matches for "{query}"</div>}
            {!loading && results.map((item) => (
              <div key={`${item.type}-${item.id}`} className="search-result" onClick={() => handleSelect(item)}>
                <span className="search-result-badge">{typeIcon[item.type] || '?'}</span>
                <div>
                  <div className="search-result-title">{item.title}</div>
                  <div className="search-result-sub">{item.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <NotificationBell />
      <div className="user-menu" ref={userMenuRef}>
        <div className="user-chip" onClick={() => setUserMenuOpen((o) => !o)}>
          <div>
            <div style={{ fontWeight: 600 }}>{user?.full_name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
          <div className="avatar">{initials}</div>
        </div>

        {userMenuOpen && (
          <div className="user-dropdown">
            <div className="user-dropdown-label">Appearance</div>
            <button
              className={`theme-option${theme === 'light' ? ' active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <span className="theme-swatch theme-swatch-light" />
              Light theme
              {theme === 'light' && <span className="check">✓</span>}
            </button>
            <button
              className={`theme-option${theme === 'dark' ? ' active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <span className="theme-swatch theme-swatch-dark" />
              Dark theme
              {theme === 'dark' && <span className="check">✓</span>}
            </button>

            <div className="user-dropdown-divider" />

            <button className="user-dropdown-item" onClick={logout}>
              Log out
            </button>
          </div>
          
        )}
      </div>
    </div>
  )
}
