import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { listDepartments, createDepartment, updateDepartment, getDepartment } from '../../api/departmentApi'
import { listCompanies } from '../../api/companyApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const emptyForm = {
  name: '', company_id: '', parent_department_id: '', is_group: false, is_active: true,
  payroll_cost_center_id: '', leave_approver_id: '', expense_approver_id: '', shift_request_approver_id: '',
}

export default function DepartmentForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const parentFromQuery = searchParams.get('parent')

  const [form, setForm] = useState(emptyForm)
  const [companies, setCompanies] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listCompanies(), listDepartments(), listEmployees()])
      .then(([compRes, deptRes, empRes]) => {
        setCompanies(compRes.data)
        setDepartments(deptRes.data)
        setEmployees(empRes.data)
        if (!isEdit && compRes.data.length) {
          setForm((f) => ({ ...f, company_id: compRes.data[0].id, parent_department_id: parentFromQuery || '' }))
        }
      })
      .finally(() => {
        if (!isEdit) setLoading(false)
      })

    if (isEdit) {
      getDepartment(id).then((res) => {
        const d = res.data
        setForm({
          name: d.name, company_id: d.company_id, parent_department_id: d.parent_department_id || '',
          is_group: d.is_group, is_active: d.is_active,
          payroll_cost_center_id: d.payroll_cost_center_id || '',
          leave_approver_id: d.leave_approver_id || '',
          expense_approver_id: d.expense_approver_id || '',
          shift_request_approver_id: d.shift_request_approver_id || '',
        })
      }).finally(() => setLoading(false))
    }
  }, [id])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  // a department can't be its own parent, and (for edit) can't be parented
  // under one of its own descendants - keep this simple and just exclude itself
  const availableParents = departments.filter((d) => d.is_group && (!isEdit || d.id !== Number(id)))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        company_id: Number(form.company_id),
        parent_department_id: form.parent_department_id ? Number(form.parent_department_id) : null,
        is_group: form.is_group,
        is_active: form.is_active,
        payroll_cost_center_id: form.payroll_cost_center_id ? Number(form.payroll_cost_center_id) : null,
        leave_approver_id: form.leave_approver_id ? Number(form.leave_approver_id) : null,
        expense_approver_id: form.expense_approver_id ? Number(form.expense_approver_id) : null,
        shift_request_approver_id: form.shift_request_approver_id ? Number(form.shift_request_approver_id) : null,
      }
      if (isEdit) {
        await updateDepartment(id, payload)
      } else {
        await createDepartment(payload)
      }
      navigate('/departments')
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save department'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/departments')}>
            ← Back to departments
          </button>
          <h1>{isEdit ? 'Edit Department' : 'New Department'}</h1>
          <p>Company, hierarchy, and approvers for this department.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {companies.length === 0 ? (
        <div className="error-banner">Create a company first before adding departments.</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Basic Info</div>
            <div className="form-section-body">
              <div className="form-grid">
                <div className="field">
                  <label>Department name</label>
                  <input value={form.name} onChange={set('name')} required autoFocus />
                </div>
                <div className="field">
                  <label>Company</label>
                  <select value={form.company_id} onChange={set('company_id')} required>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Parent Department (optional)</label>
                <select value={form.parent_department_id} onChange={set('parent_department_id')}>
                  <option value="">— None (top level) —</option>
                  {availableParents.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Only departments marked "Is Group" can be a parent.</span>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={form.is_group} onChange={set('is_group')} />
                  Is Group (can have sub-departments)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={form.is_active} onChange={set('is_active')} />
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">2</span> Payroll</div>
            <div className="form-section-body">
              <div className="field">
                <label>Payroll Cost Center ID (optional)</label>
                <input type="number" value={form.payroll_cost_center_id} onChange={set('payroll_cost_center_id')} placeholder="Cost Center ID from Accounts" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">3</span> Approvers</div>
            <div className="form-section-body">
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14 }}>
                Default approver for this department's employees, per request type.
              </p>
              <div className="field">
                <label>Leave Approver</label>
                <select value={form.leave_approver_id} onChange={set('leave_approver_id')}>
                  <option value="">— None —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Expense Approver</label>
                <select value={form.expense_approver_id} onChange={set('expense_approver_id')}>
                  <option value="">— None —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Shift Request Approver</label>
                <select value={form.shift_request_approver_id} onChange={set('shift_request_approver_id')}>
                  <option value="">— None —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="sticky-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/departments')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create Department'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
