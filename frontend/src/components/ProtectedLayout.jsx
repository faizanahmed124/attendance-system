import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function ProtectedLayout() {
  const { user, loading } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  // close the mobile drawer automatically whenever the route changes
  useEffect(() => { setMobileNavOpen(false) }, [location.pathname])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      {mobileNavOpen && <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <div className="main">
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}