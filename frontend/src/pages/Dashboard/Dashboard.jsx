import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { Users, UserPlus, UserMinus, CalendarClock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { listEmployees } from '../../api/employeeApi'
import { listAttendance } from '../../api/attendanceApi'
import { listLeaveApplications } from '../../api/leaveApi'
import { listDepartments } from '../../api/departmentApi'

function isoDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const STATUS_COLORS = { Present: '#3DD68C', Absent: '#F2555A', 'On Leave': '#F5A623', 'Half Day': '#7C8CF8' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [leaveApplications, setLeaveApplications] = useState([])
  const [trend, setTrend] = useState([])
  const [todayBreakdown, setTodayBreakdown] = useState([])
  const [weeklyAttendance, setWeeklyAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = isoDaysAgo(0)
    const weekAgo = isoDaysAgo(6)

    Promise.all([
      listEmployees(),
      listDepartments(),
      listLeaveApplications({ status: 'Open' }).catch(() => ({ data: [] })),
      listAttendance({ from_date: weekAgo, to_date: today }).catch(() => ({ data: [] })),
    ]).then(([empRes, deptRes, leaveRes, attRes]) => {
      setEmployees(empRes.data)
      setDepartments(deptRes.data)
      setLeaveApplications(leaveRes.data)

      const records = attRes.data
      const byDay = {}
      for (let i = 6; i >= 0; i--) {
        const day = isoDaysAgo(i)
        byDay[day] = { date: day, Present: 0, Absent: 0 }
      }
      records.forEach((r) => {
        const day = r.attendance_date
        if (!byDay[day]) return
        if (r.status === 'Present') byDay[day].Present += 1
        else byDay[day].Absent += 1
      })
      const trendData = Object.values(byDay).map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
      }))
      setTrend(trendData)
      setWeeklyAttendance(trendData)

      const todayRecords = records.filter((r) => r.attendance_date === today)
      const counts = {}
      todayRecords.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1 })
      setTodayBreakdown(Object.entries(counts).map(([name, value]) => ({ name, value })))
    }).finally(() => setLoading(false))
  }, [])

  const activeCount = employees.filter((e) => e.status === 'active').length
  const newThisMonth = employees.filter((e) => {
    const joined = new Date(e.date_of_joining)
    const now = new Date()
    return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear()
  }).length
  const resignedCount = employees.filter((e) => e.status === 'resigned').length
  const onLeaveToday = employees.filter((e) => e.status === 'on_leave').length

  const deptHeadcount = departments.map((d) => ({
    name: d.name,
    count: employees.filter((e) => e.department_id === d.id).length,
  })).filter((d) => d.count > 0)

  const attendanceRatePct = (() => {
    const totalToday = todayBreakdown.reduce((s, d) => s + d.value, 0)
    const present = todayBreakdown.find((d) => d.name === 'Present')?.value || 0
    return totalToday > 0 ? Math.round((present / totalToday) * 100) : 0
  })()

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div className="hr-dashboard">
      <div className="hr-dash-header">
        <div>
          <h1>Welcome back, {user?.full_name?.split(' ')[0] || 'there'} 👋</h1>
          <p>Here's what's happening across your company today.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/employees/new')}>
          + Add Employee
        </button>
      </div>

      <div className="hr-stat-grid">
        <StatCard icon={Users} tone="blue" label="Total Employees" value={employees.length} sub={`${activeCount} active`} />
        <StatCard icon={UserPlus} tone="green" label="New This Month" value={newThisMonth} sub="joined recently" trendUp />
        <StatCard icon={UserMinus} tone="red" label="Resigned" value={resignedCount} sub="all time" />
        <StatCard icon={CalendarClock} tone="purple" label="Pending Leave Requests" value={leaveApplications.length} sub="awaiting approval" />
      </div>

      <div className="hr-main-grid">
        <div className="hr-card hr-card-wide">
          <div className="hr-card-header">
            <div>
              <strong>Attendance Trend</strong>
              <span className="hr-card-sub">Present vs. Absent, last 7 days</span>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFA" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7C5CFA" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F2555A" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#F2555A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: 'var(--ink-faint)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: 'var(--ink-faint)' }} axisLine={false} tickLine={false} width={26} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12.5 }} />
                <Area type="monotone" dataKey="Present" stroke="#7C5CFA" strokeWidth={2.5} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="Absent" stroke="#F2555A" strokeWidth={2} fill="url(#absentGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hr-card">
          <div className="hr-card-header">
            <div>
              <strong>Today's Attendance</strong>
              <span className="hr-card-sub">Live breakdown</span>
            </div>
          </div>
          <div style={{ height: 160, position: 'relative' }}>
            {todayBreakdown.length === 0 ? (
              <div className="hr-empty">No attendance marked yet today</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={todayBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3}>
                      {todayBreakdown.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || '#9CA3AF'} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12.5 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="hr-donut-center">
                  <div className="hr-donut-pct">{attendanceRatePct}%</div>
                  <div className="hr-donut-label">Present</div>
                </div>
              </>
            )}
          </div>
          <div className="hr-legend">
            {todayBreakdown.map((d) => (
              <div key={d.name} className="hr-legend-item">
                <span className="hr-legend-dot" style={{ background: STATUS_COLORS[d.name] || '#9CA3AF' }} />
                {d.name} · {d.value}
              </div>
            ))}
          </div>
        </div>

        <div className="hr-card hr-card-wide">
          <div className="hr-card-header">
            <div>
              <strong>Weekly Attendance</strong>
              <span className="hr-card-sub">Present headcount per day</span>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: 'var(--ink-faint)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: 'var(--ink-faint)' }} axisLine={false} tickLine={false} width={26} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12.5 }} cursor={{ fill: 'var(--border)', opacity: 0.3 }} />
                <Bar dataKey="Present" fill="#7C5CFA" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hr-card">
          <div className="hr-card-header">
            <div>
              <strong>Headcount by Department</strong>
              <span className="hr-card-sub">Current distribution</span>
            </div>
          </div>
          {deptHeadcount.length === 0 ? (
            <div className="hr-empty">No data yet</div>
          ) : (
            <div className="hr-dept-list">
              {deptHeadcount.map((d) => {
                const max = Math.max(...deptHeadcount.map((x) => x.count), 1)
                return (
                  <div key={d.name} className="hr-dept-row">
                    <span className="hr-dept-name">{d.name}</span>
                    <div className="hr-dept-bar-track">
                      <div className="hr-dept-bar-fill" style={{ width: `${(d.count / max) * 100}%` }} />
                    </div>
                    <span className="hr-dept-count">{d.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, tone, label, value, sub, trendUp }) {
  return (
    <div className={`hr-stat-card hr-tone-${tone}`}>
      <div className="hr-stat-icon"><Icon size={18} /></div>
      <div className="hr-stat-body">
        <div className="hr-stat-label">{label}</div>
        <div className="hr-stat-value">{value}</div>
        <div className="hr-stat-sub">
          {trendUp !== undefined && (trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
          {sub}
        </div>
      </div>
    </div>
  )
}