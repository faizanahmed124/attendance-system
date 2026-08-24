import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusPill from '../../components/StatusPill'
import { getSalarySlip, addSlipComponent, removeSlipComponent, submitSalarySlip, markSalarySlipPaid, deleteSalarySlip } from '../../api/payrollApi'
import { getEmployee } from '../../api/employeeApi'

export default function SalarySlipDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [slip, setSlip] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newComponent, setNewComponent] = useState({ component_type: 'Earning', component_name: '', amount: '' })
  const [adding, setAdding] = useState(false)

  const load = () => {
    setLoading(true)
    getSalarySlip(id)
      .then((res) => {
        setSlip(res.data)
        return getEmployee(res.data.employee_id)
      })
      .then((empRes) => setEmployee(empRes.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load salary slip'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleAddComponent = async () => {
    if (!newComponent.component_name || !newComponent.amount) return
    setAdding(true)
    setError('')
    try {
      await addSlipComponent(id, { ...newComponent, amount: Number(newComponent.amount) })
      setNewComponent({ component_type: 'Earning', component_name: '', amount: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add component')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveComponent = async (componentId) => {
    try {
      await removeSlipComponent(id, componentId)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove component')
    }
  }

  const handleSubmit = async () => {
    try {
      await submitSalarySlip(id)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit slip')
    }
  }

  const handleMarkPaid = async () => {
    try {
      await markSalarySlipPaid(id)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not mark slip as paid')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this salary slip?')) return
    try {
      await deleteSalarySlip(id)
      navigate('/payroll/salary-slips')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete slip')
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !slip) return <div className="error-banner">{error}</div>
  if (!slip) return null

  const isDraft = slip.status === 'Draft'
  const earnings = slip.components.filter((c) => c.component_type === 'Earning')
  const deductions = slip.components.filter((c) => c.component_type === 'Deduction')

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/payroll/salary-slips')}>
            ← Back to salary slips
          </button>
          <h1>Salary Slip · {employee?.full_name || `Employee #${slip.employee_id}`}</h1>
          <p><span className="mono">{slip.pay_period_start} → {slip.pay_period_end}</span> · <StatusPill status={slip.status === 'Paid' ? 'active' : slip.status === 'Submitted' ? 'leave' : 'inactive'} /></p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {slip.status === 'Draft' && <button className="btn btn-outline" onClick={handleSubmit}>Submit</button>}
          {slip.status === 'Submitted' && <button className="btn btn-primary" onClick={handleMarkPaid}>Mark Paid</button>}
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="profile-layout">
        <div className="profile-photo-card">
          <div className="photo-frame">
            {employee ? employee.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
          </div>
          <div className="profile-name">{employee?.full_name}</div>
          <div className="profile-code mono">{employee?.employee_code}</div>

          <div className="profile-meta">
            <div className="row"><span>Basic salary</span><span className="mono">{slip.basic_salary.toLocaleString()}</span></div>
            <div className="row"><span>Payable days</span><span className="mono">{slip.payable_days}</span></div>
            <div className="row"><span>Absent days</span><span className="mono">{slip.absent_days}</span></div>
            {slip.payment_date && <div className="row"><span>Paid on</span><span className="mono">{slip.payment_date}</span></div>}
          </div>

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '2px solid var(--border)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Net Pay</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{slip.net_pay.toLocaleString()}</div>
          </div>
        </div>

        <div>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Earnings</div>
            <div className="form-section-body">
              {earnings.length === 0 ? (
                <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No earning components.</div>
              ) : (
                earnings.map((c) => (
                  <div className="doc-row" key={c.id}>
                    <div style={{ flex: 1 }}><div className="doc-name">{c.component_name}</div></div>
                    <span className="mono">{c.amount.toLocaleString()}</span>
                    {isDraft && <button className="btn btn-danger btn-sm" onClick={() => handleRemoveComponent(c.id)}>×</button>}
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 700, fontSize: 13 }}>
                <span>Gross Pay</span><span className="mono">{slip.gross_pay.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">2</span> Deductions</div>
            <div className="form-section-body">
              {deductions.length === 0 ? (
                <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No deduction components.</div>
              ) : (
                deductions.map((c) => (
                  <div className="doc-row" key={c.id}>
                    <div style={{ flex: 1 }}><div className="doc-name">{c.component_name}</div></div>
                    <span className="mono">{c.amount.toLocaleString()}</span>
                    {isDraft && <button className="btn btn-danger btn-sm" onClick={() => handleRemoveComponent(c.id)}>×</button>}
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 700, fontSize: 13 }}>
                <span>Total Deductions</span><span className="mono">{slip.total_deductions.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {isDraft && (
            <div className="form-section">
              <div className="form-section-header"><span className="num">3</span> Add Component</div>
              <div className="form-section-body">
                <div className="add-doc-row">
                  <select value={newComponent.component_type} onChange={(e) => setNewComponent({ ...newComponent, component_type: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }}>
                    <option value="Earning">Earning</option>
                    <option value="Deduction">Deduction</option>
                  </select>
                  <input type="text" placeholder="e.g. House Rent Allowance, Income Tax" value={newComponent.component_name} onChange={(e) => setNewComponent({ ...newComponent, component_name: e.target.value })} />
                  <input type="number" placeholder="Amount" value={newComponent.amount} onChange={(e) => setNewComponent({ ...newComponent, amount: e.target.value })} style={{ width: 110, padding: 8, border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={handleAddComponent} disabled={adding}>Add</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
