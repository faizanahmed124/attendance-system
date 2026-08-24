import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import StatusPill from '../../components/StatusPill'
import { listShiftTypes } from '../../api/attendanceApi'

export default function ShiftTypes() {
  const navigate = useNavigate()
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listShiftTypes().then((res) => setShifts(res.data)).finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'name', label: 'Shift' },
    { key: 'start_time', label: 'Start', render: (r) => <span className="mono">{r.start_time}</span> },
    { key: 'end_time', label: 'End', render: (r) => <span className="mono">{r.end_time}</span> },
    { key: 'roster_color', label: 'Color' },
    { key: 'enable_auto_attendance', label: 'Auto Attendance', render: (r) => <StatusPill status={r.enable_auto_attendance ? 'active' : 'inactive'} /> },
    { key: 'late_entry_grace_minutes', label: 'Late Grace (min)', render: (r) => <span className="mono">{r.late_entry_grace_minutes}</span> },
    { key: 'early_exit_grace_minutes', label: 'Early Grace (min)', render: (r) => <span className="mono">{r.early_exit_grace_minutes}</span> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Shift Types</h1>
          <p>Working hours, auto-attendance rules, and late/early grace periods.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate('/attendance/shift-assignments')}>
            View Assignments
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/attendance/shift-types/new')}>
            + New Shift Type
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={shifts}
          emptyMessage="No shift types yet"
          onRowClick={(row) => navigate(`/attendance/shift-types/${row.id}/edit`)}
        />
      )}
    </div>
  )
}
