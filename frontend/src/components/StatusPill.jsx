const map = {
  Present: 'pill-present',
  Absent: 'pill-absent',
  'On Leave': 'pill-leave',
  'Half Day': 'pill-leave',
  'Work From Home': 'pill-active',
  active: 'pill-active',
  inactive: 'pill-inactive',
  resigned: 'pill-inactive',
  on_leave: 'pill-leave',
  // recruitment
  Open: 'pill-active',
  Closed: 'pill-inactive',
  Interviewing: 'pill-leave',
  Offered: 'pill-leave',
  Hired: 'pill-present',
  Rejected: 'pill-absent',
  Scheduled: 'pill-leave',
  Cleared: 'pill-present',
}

export default function StatusPill({ status }) {
  const cls = map[status] || 'pill-inactive'
  return <span className={`pill ${cls}`}>{status}</span>
}
