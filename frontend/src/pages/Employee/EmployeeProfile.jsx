import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmployee, deleteEmployee } from '../../api/employeeApi'
import { API_BASE_URL } from '../../api/axiosClient'
import { listCompanies } from '../../api/companyApi'
import { listDepartments } from '../../api/departmentApi'
import { listDesignations } from '../../api/designationApi'
import { listShiftTypes } from '../../api/attendanceApi'
import StatusPill from '../../components/StatusPill'

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employee, setEmployee] = useState(null)
  const [lookups, setLookups] = useState({ companies: [], departments: [], designations: [], shiftTypes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getEmployee(id), listCompanies(), listDepartments(), listDesignations(), listShiftTypes()])
      .then(([empRes, compRes, deptRes, desigRes, shiftRes]) => {
        setEmployee(empRes.data)
        setLookups({
          companies: compRes.data, departments: deptRes.data,
          designations: desigRes.data, shiftTypes: shiftRes.data,
        })
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load employee'))
      .finally(() => setLoading(false))
  }, [id])

  const nameOf = (list, empId) => list.find((x) => x.id === empId)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteEmployee(id)
      navigate('/employees')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete employee')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !employee) return <div className="error-banner">{error}</div>
  if (!employee) return null

  const photoSrc = employee.photo_url ? `${API_BASE_URL}${employee.photo_url}` : null
  const initials = employee.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const department = nameOf(lookups.departments, employee.department_id)
  const designation = nameOf(lookups.designations, employee.designation_id)
  const company = nameOf(lookups.companies, employee.company_id)
  const shift = nameOf(lookups.shiftTypes, employee.shift_type_id)
  const v = (x) => x || x === 0 ? x : '—'

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/employees')}>
            ← Back to employees
          </button>
          <h1>{employee.salutation ? `${employee.salutation}. ` : ''}{employee.full_name}</h1>
          <p><span className="mono">{employee.employee_code}</span> · {designation?.title || '—'} · {department?.name || '—'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate(`/employees/${id}/edit`)}>Edit</button>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="profile-layout">
        <div className="profile-photo-card">
          <div className="photo-frame">
            {photoSrc ? <img src={photoSrc} alt={employee.full_name} /> : initials}
          </div>
          <div className="profile-name">{employee.full_name}</div>
          <div className="profile-code">{employee.employee_code}</div>
          <div style={{ marginTop: 10 }}><StatusPill status={employee.status} /></div>

          <div className="profile-meta">
            <div className="row"><span>Company</span><span>{company?.name || '—'}</span></div>
            <div className="row"><span>Branch</span><span>{v(employee.branch)}</span></div>
            <div className="row"><span>Grade</span><span>{v(employee.grade)}</span></div>
            <div className="row"><span>Shift</span><span>{shift?.name || '—'}</span></div>
            <div className="row"><span>Type</span><span>{v(employee.employment_type)}</span></div>
            <div className="row"><span>Joined</span><span className="mono">{employee.date_of_joining}</span></div>
            {employee.contract_expiry && (
              <div className="row"><span>Contract ends</span><span className="mono">{employee.contract_expiry}</span></div>
            )}
          </div>
        </div>

        <div>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Basic Information</div>
            <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
              <DetailRow label="Father name" value={v(employee.father_name)} />
              <DetailRow label="CNIC" value={v(employee.cnic)} />
              <DetailRow label="Gender" value={v(employee.gender)} />
              <DetailRow label="Date of birth" value={v(employee.date_of_birth)} />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">2</span> Job Information</div>
            <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
              <DetailRow label="Manager" value={employee.manager_id ? `#${employee.manager_id}` : '—'} />
              <DetailRow label="Expense approver" value={employee.expense_approver_id ? `#${employee.expense_approver_id}` : '—'} />
              <DetailRow label="Leave approver" value={employee.leave_approver_id ? `#${employee.leave_approver_id}` : '—'} />
              <DetailRow label="Offer date" value={v(employee.offer_date)} />
              <DetailRow label="Confirmation date" value={v(employee.confirmation_date)} />
              <DetailRow label="Notice (days)" value={v(employee.notice_days)} />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">3</span> Contact &amp; Address</div>
            <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
              <DetailRow label="Phone" value={v(employee.phone)} />
              <DetailRow label="Company email" value={employee.email} />
              <DetailRow label="Personal email" value={v(employee.personal_email)} />
              <DetailRow label="Current address" value={v(employee.current_address)} />
              <DetailRow label="Permanent address" value={v(employee.permanent_address)} />
              <DetailRow label="Emergency contact" value={employee.emergency_contact_name ? `${employee.emergency_contact_name} (${v(employee.emergency_contact_relation)}) — ${employee.emergency_contact_phone || ''}` : '—'} />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">4</span> Compensation &amp; Benefits</div>
            <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
              <DetailRow label="Basic Pay" value={employee.salary != null ? <span className="mono">{employee.salary.toLocaleString()}</span> : '—'} />
              <DetailRow label="CTC" value={employee.ctc != null ? <span className="mono">{employee.ctc.toLocaleString()}</span> : '—'} />
              <DetailRow label="Salary mode" value={v(employee.salary_mode)} />
              <DetailRow label="Bank" value={employee.bank_name ? `${employee.bank_name} — ${v(employee.bank_account_no)}` : '—'} />
              <DetailRow label="Medical allow" value={employee.medical_allow ? 'Yes' : 'No'} />
              <DetailRow label="Gratuity allow" value={employee.gratuity_allow ? 'Yes' : 'No'} />
              <DetailRow label="Benefits notes" value={v(employee.benefits)} />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">5</span> Personal &amp; Health</div>
            <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
              <DetailRow label="Marital status" value={v(employee.marital_status)} />
              <DetailRow label="Blood group" value={v(employee.blood_group)} />
              <DetailRow label="Health insurance" value={employee.health_insurance_provider ? `${employee.health_insurance_provider} (${v(employee.health_insurance_no)})` : '—'} />
              <DetailRow label="Passport number" value={v(employee.passport_number)} />
            </div>
          </div>

          {employee.bio && (
            <div className="form-section">
              <div className="form-section-header"><span className="num">6</span> Bio</div>
              <div className="form-section-body">
                <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{employee.bio}</p>
              </div>
            </div>
          )}

          <div className="form-section">
            <div className="form-section-header"><span className="num">7</span> Documents</div>
            <div className="form-section-body">
              {employee.documents.length === 0 ? (
                <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No documents uploaded.</div>
              ) : (
                employee.documents.map((doc) => (
                  <div className="doc-row" key={doc.id}>
                    <div className="doc-icon">▤</div>
                    <div style={{ flex: 1 }}>
                      <div className="doc-name">{doc.document_name}</div>
                      <div className="doc-date">{new Date(doc.uploaded_at).toLocaleDateString()}</div>
                    </div>
                    <a className="btn btn-outline btn-sm" href={`${API_BASE_URL}${doc.file_url}`} target="_blank" rel="noreferrer">View</a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Delete {employee.full_name}?</h3></div>
            <div className="modal-body">This employee profile and all its documents will be permanently removed.</div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13.5, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}
