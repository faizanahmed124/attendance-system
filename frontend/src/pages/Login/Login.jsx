import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="mark">A</div>
          <div>
            <div className="name">Attendance</div>
            <div className="tag">HR LEDGER</div>
          </div>
        </div>

        <h1>Sign in</h1>
        <p className="sub">Use your work email to access the attendance system.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary full-width" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-hint">
          Seeded admin login → admin@example.com / Admin@123
          <br />
          Run backend/seed.py first if this account doesn't exist yet.
        </div>
      </div>
    </div>
  )
}
