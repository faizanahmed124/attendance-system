import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import { MODULE_OVERVIEWS } from '../../config/moduleOverviews'
import { listEmployees } from '../../api/employeeApi'
import { listDepartments } from '../../api/departmentApi'
import { listDesignations } from '../../api/designationApi'
import { listCompanies } from '../../api/companyApi'
import { listAttendance, listShiftTypes } from '../../api/attendanceApi'
import { listJobOpenings, listApplicants } from '../../api/recruitmentApi'
import { listBiometricDevices, listCCTVCameras } from '../../api/integrationApi'
import { listAccounts } from '../../api/accountsApi'
import { listPayrollEntries, listSalarySlips } from '../../api/payrollApi'

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

const COUNT_FETCHERS = {
  employees: () => listEmployees().then((r) => r.data.length),
  departments: () => listDepartments().then((r) => r.data.length),
  designations: () => listDesignations().then((r) => r.data.length),
  companies: () => listCompanies().then((r) => r.data.length),
  attendanceToday: () => {
    const today = isoToday()
    return listAttendance({ from_date: today, to_date: today }).then((r) => r.data.length)
  },
  shiftTypes: () => listShiftTypes().then((r) => r.data.length),
  jobOpenings: () => listJobOpenings({ status: 'Open' }).then((r) => r.data.length),
  applicants: () => listApplicants().then((r) => r.data.length),
  biometricDevices: () => listBiometricDevices().then((r) => r.data.length),
  cctvCameras: () => listCCTVCameras().then((r) => r.data.length),
  accounts: () => listAccounts().then((r) => r.data.length),
  payrollEntries: () => listPayrollEntries().then((r) => r.data.length),
  salarySlips: () => listSalarySlips().then((r) => r.data.length),
}

// Distinct, muted palette matching the app's brand colors - reused per slice.
const PIE_COLORS = ['#1E4FD8', '#17A9D6', '#2F9E5C', '#C68A1D', '#D4433A', '#7C5CD6', '#0F766E', '#B45309']
const LINE_COLOR = '#1E4FD8'
const GRID_COLOR = '#DFE2DC'

// Each chart key knows how to fetch + shape its own data, and which chart
// type to render it as ('line' or 'pie'). Add a new entry here and
// reference its key from a module's `chart` field in
// config/moduleOverviews.js to show a chart on that module's overview.
const CHART_LOADERS = {
  employeesByDepartment: {
    title: "Employees by Department",
    subtitle: 'Current headcount split across departments',
    type: 'line',
    load: () =>
      Promise.all([listEmployees(), listDepartments()]).then(([empRes, deptRes]) => {
        const departments = deptRes.data
        const employees = empRes.data
        return departments.map((dept) => ({
          name: dept.name,
          value: employees.filter((e) => e.department_id === dept.id).length,
        }))
      }),
  },
  recruitmentPipeline: {
    title: 'Recruitment Pipeline',
    subtitle: 'Open positions vs. hires made, per job opening',
    type: 'bar',
    barKeys: [
      { key: 'positions', label: 'Positions', color: '#17A9D6' },
      { key: 'hired', label: 'Hired', color: '#2F9E5C' },
    ],
    load: () =>
      Promise.all([listJobOpenings(), listApplicants()]).then(([jobRes, appRes]) => {
        const jobs = jobRes.data
        const applicants = appRes.data
        return jobs.map((job) => ({
          name: job.title,
          positions: job.positions,
          hired: applicants.filter((a) => a.job_opening_id === job.id && a.status === 'Hired').length,
        }))
      }),
  },
}

export default function ModuleOverview() {
  const { moduleKey } = useParams()
  const config = MODULE_OVERVIEWS[moduleKey]
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState(null)
  const [chartLoading, setChartLoading] = useState(false)

  useEffect(() => {
    if (!config) return
    setLoading(true)
    const keys = [...new Set(config.shortcuts.filter((s) => s.countKey).map((s) => s.countKey))]
    Promise.all(keys.map((k) => COUNT_FETCHERS[k]()))
      .then((values) => {
        const result = {}
        keys.forEach((k, i) => { result[k] = values[i] })
        setCounts(result)
      })
      .finally(() => setLoading(false))

    if (config.chart && CHART_LOADERS[config.chart]) {
      setChartLoading(true)
      CHART_LOADERS[config.chart].load()
        .then(setChartData)
        .finally(() => setChartLoading(false))
    } else {
      setChartData(null)
    }
  }, [moduleKey])

  if (!config) {
    return <div className="error-banner">Module "{moduleKey}" not found.</div>
  }

  const chartConfig = config.chart ? CHART_LOADERS[config.chart] : null
  const totalChartValue = chartData ? chartData.reduce((sum, d) => sum + d.value, 0) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
      </div>

      {chartConfig && (
        <div className="card chart-card" style={{ marginBottom: 20 }}>
          <div className="card-pad chart-card-header">
            <strong>{chartConfig.title}</strong>
            <span className="chart-subtitle">{chartConfig.subtitle}</span>
          </div>
          <div style={{ height: 260 }}>
            {chartLoading ? (
              <div className="empty-state" style={{ padding: '30px 10px' }}><div>Loading…</div></div>
            ) : !chartData || chartData.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 10px' }}><div>No data yet</div></div>
            ) : chartConfig.type === 'line' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 16, right: 24, left: -10, bottom: 4 }}>
                  <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--ink-soft)' }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5 }} />
                  <Line type="monotone" dataKey="value" name="Employees" stroke={LINE_COLOR} strokeWidth={2.5} dot={{ r: 4, fill: LINE_COLOR }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : chartConfig.type === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 24, left: -10, bottom: 4 }}>
                  <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: 'var(--ink-soft)' }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5 }} cursor={{ fill: GRID_COLOR, opacity: 0.3 }} />
                  <Legend verticalAlign="top" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5 }} />
                  {chartConfig.barKeys.map((bk) => (
                    <Bar key={bk.key} dataKey={bk.key} name={bk.label} fill={bk.color} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5 }}
                    formatter={(value, name) => [`${value} (${Math.round((value / totalChartValue) * 100)}%)`, name]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="overview-section-label">Your Shortcuts</div>
      <div className="shortcut-grid">
        {config.shortcuts.map((s) => (
          <Link key={s.label} to={s.to} className="shortcut-pill">
            <span>{s.label}</span>
            {s.countKey && (
              <span className="shortcut-count">
                {loading ? '…' : counts[s.countKey]}{s.countLabel ? ` ${s.countLabel}` : ''}
              </span>
            )}
            <span className="shortcut-arrow">↗</span>
          </Link>
        ))}
      </div>

      <div className="overview-section-label">Reports &amp; Masters</div>
      <div className="reports-columns">
        {config.sections.map((sec) => (
          <div key={sec.title} className="reports-column">
            <div className="reports-column-title">{sec.title}</div>
            {sec.links.map((l) => (
              <Link key={l.label} to={l.to} className="reports-link">
                {l.label} <span className="reports-link-arrow">↗</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}