import { NavLink } from 'react-router-dom'
import {
  FileBarChart2,
  LifeBuoy,
  Sparkles,
  CalendarDays,
  CreditCard,
  LayoutDashboard, Users, UserPlus, Clock, Wallet, Landmark, Cpu, Settings, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const MODULES = [
  { to:  '/', label: 'Overview', icon: Users },
  { to: '/modules/hr', label: 'HR', end: true, icon: LayoutDashboard },
  { to: '/modules/recruitment', label: 'Recruitment', icon: UserPlus },
  { to: '/modules/attendance', label: 'Shift & Attendance', icon: Clock },
  { to: '/modules/payroll', label: 'Payroll', icon: Wallet },
  { to: '/modules/accounts', label: 'Accounts', icon: Landmark },
  { to: '/modules/integration', label: 'Integration', icon: Cpu },
  { to: '/modules/loan', label: 'Loan Management', icon: CreditCard },
  { to: '/modules/leave', label: 'Leave Management', icon: CalendarDays },
  { to: '/recognition', label: 'Recognition', icon: Sparkles },
  { to: '/helpdesk/tickets', label: 'Help Desk', icon: LifeBuoy },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
]

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { user } = useAuth()

  return (
    <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="mark">K</div>
        <div>
          <div className="name">Kaixen</div>
          <div className="tag">HR Software</div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <div className="nav-section-label">Modules</div>
      {MODULES.map((m) => (
        <NavLink
          key={m.to}
          to={m.to}
          end={m.end}
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          <m.icon size={16} strokeWidth={2} />
          {m.label}
        </NavLink>
      ))}

      {user?.role === 'admin' && (
        <>
          <div className="nav-section-label">Admin</div>
          <NavLink
            to="/modules/settings"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <Settings size={16} strokeWidth={2} />
            Settings
          </NavLink>
        </>
      )}
    </aside>
  )
}