import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../../utils/errorMessage'
import {
  getEmployee, createEmployee, updateEmployee, listEmployees,
  uploadEmployeePhoto, uploadEmployeeDocument, deleteEmployeeDocument,
} from '../../api/employeeApi'
import { API_BASE_URL } from '../../api/axiosClient'
import { listCompanies } from '../../api/companyApi'
import { listDepartments } from '../../api/departmentApi'
import { listDesignations } from '../../api/designationApi'
import { listShiftTypes } from '../../api/attendanceApi'
import { listHolidayLists } from '../../api/holidayApi'

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Probation']
const STATUS_OPTIONS = ['active', 'inactive', 'on_leave', 'resigned']
const SALUTATIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof']
const MARITAL_STATUS = ['Single', 'Married', 'Divorced', 'Widowed']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const ACCOMMODATION_TYPES = ['Owned', 'Rented']
const SALARY_MODES = ['Bank', 'Cash', 'Cheque']
const YES_NO = ['Yes', 'No']

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'joining', label: 'Joining' },
  { key: 'contact', label: 'Address & Contacts' },
  { key: 'emergency', label: 'Emergency Contact' },
  { key: 'attendance', label: 'Attendance & Leaves' },
  { key: 'salary', label: 'Salary' },
  { key: 'benefits', label: 'Company Benefits' },
  { key: 'personal', label: 'Personal Details' },
  { key: 'profile', label: 'Profile' },
  { key: 'exit', label: 'Employee Exit' },
  { key: 'documents', label: 'Documents' },
]

const emptyForm = {
  employee_code: '', salutation: '', first_name: '', middle_name: '', last_name: '',
  full_name: '', father_name: '', cnic: '', gender: '', date_of_birth: '', status: 'active',
  company_id: '', department_id: '', designation_id: '', branch: '', grade: '',
  shift_type_id: '', employment_type: '', date_of_joining: '', contract_expiry: '', manager_id: '',
  offer_date: '', confirmation_date: '', notice_days: '', date_of_retirement: '',
  phone: '', email: '', personal_email: '', preferred_contact_email: '',
  current_address: '', current_accommodation_type: '', permanent_address: '', permanent_accommodation_type: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  biometric_id: '', allow_overtime: false, holiday_list_id: '',
  expense_approver_id: '', leave_approver_id: '', shift_request_approver_id: '',
  salary: '', ctc: '', income_tax_amount: '', salary_currency: 'PKR', salary_mode: '',
  payroll_cost_center_id: '', benefits: '',
  bank_name: '', bank_account_no: '', iban: '',
  medical_allow: false, medical_amount: '', gratuity_allow: false, total_gratuity: '', consumed_gratuity_amount: '',
  marital_status: '', family_background: '', blood_group: '', health_details: '',
  health_insurance_provider: '', health_insurance_no: '',
  passport_number: '', passport_valid_upto: '', passport_date_of_issue: '', passport_place_of_issue: '',
  bio: '',
  resignation_letter_date: '', relieving_date: '', exit_interview_date: '', new_workplace: '',
  leave_encashed: '', encashment_date: '', reason_for_leaving: '', exit_feedback: '',
}

export default function EmployeeForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('overview')
  const [form, setForm] = useState(emptyForm)
  const [companies, setCompanies] = useState([])
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [shiftTypes, setShiftTypes] = useState([])
  const [holidayLists, setHolidayLists] = useState([])
  const [employees, setEmployees] = useState([])

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)

  const [pendingDocs, setPendingDocs] = useState([])
  const [existingDocs, setExistingDocs] = useState([])
  const [newDocName, setNewDocName] = useState('')
  const [newDocFile, setNewDocFile] = useState(null)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  useEffect(() => {
    Promise.all([listCompanies(), listDepartments(), listDesignations(), listShiftTypes(), listHolidayLists(), listEmployees()])
      .then(([compRes, deptRes, desigRes, shiftRes, holRes, empRes]) => {
        setCompanies(compRes.data)
        setDepartments(deptRes.data)
        setDesignations(desigRes.data)
        setShiftTypes(shiftRes.data)
        setHolidayLists(holRes.data)
        setEmployees(empRes.data)
        if (!isEdit) {
          setForm((f) => ({
            ...f,
            company_id: compRes.data[0]?.id || '',
            department_id: deptRes.data[0]?.id || '',
            designation_id: desigRes.data[0]?.id || '',
          }))
        }
      })

    if (isEdit) {
      getEmployee(id).then((res) => {
        const e = res.data
        const f = { ...emptyForm }
        Object.keys(f).forEach((key) => {
          if (e[key] !== undefined && e[key] !== null) f[key] = e[key]
        })
        setForm(f)
        setExistingPhotoUrl(e.photo_url)
        setExistingDocs(e.documents || [])
        setLoading(false)
      }).catch((err) => {
        setError(err.response?.data?.detail || 'Could not load employee')
        setLoading(false)
      })
    }
  }, [id])

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    if (isEdit) {
      try {
        const res = await uploadEmployeePhoto(id, file)
        setExistingPhotoUrl(res.data.photo_url)
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not upload photo')
      }
    }
  }

  const addPendingDoc = () => {
    if (!newDocName || !newDocFile) return
    setPendingDocs([...pendingDocs, { name: newDocName, file: newDocFile }])
    setNewDocName('')
    setNewDocFile(null)
  }

  const addDocToExistingEmployee = async () => {
    if (!newDocName || !newDocFile) return
    try {
      const res = await uploadEmployeeDocument(id, newDocName, newDocFile)
      setExistingDocs([...existingDocs, res.data])
      setNewDocName('')
      setNewDocFile(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not upload document')
    }
  }

  const removeExistingDoc = async (docId) => {
    try {
      await deleteEmployeeDocument(id, docId)
      setExistingDocs(existingDocs.filter((d) => d.id !== docId))
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete document')
    }
  }

  const idFields = [
    'company_id', 'department_id', 'designation_id', 'shift_type_id', 'manager_id',
    'expense_approver_id', 'leave_approver_id', 'shift_request_approver_id',
    'holiday_list_id', 'payroll_cost_center_id',
  ]
  const floatFields = ['salary', 'ctc', 'income_tax_amount', 'medical_amount', 'total_gratuity', 'consumed_gratuity_amount']
  const intFields = ['notice_days']
  const dateFields = [
    'date_of_birth', 'contract_expiry', 'offer_date', 'confirmation_date', 'date_of_retirement',
    'passport_valid_upto', 'passport_date_of_issue', 'resignation_letter_date', 'relieving_date',
    'exit_interview_date', 'encashment_date',
  ]

  const buildPayload = () => {
    const payload = { ...form }
    idFields.forEach((f) => { payload[f] = payload[f] ? Number(payload[f]) : null })
    floatFields.forEach((f) => { payload[f] = payload[f] !== '' ? Number(payload[f]) : null })
    intFields.forEach((f) => { payload[f] = payload[f] !== '' ? Number(payload[f]) : null })
    dateFields.forEach((f) => { payload[f] = payload[f] || null })
    return payload
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (isEdit) {
        await updateEmployee(id, buildPayload())
        navigate(`/employees/${id}`)
      } else {
        const res = await createEmployee(buildPayload())
        const newId = res.data.id
        if (photoFile) await uploadEmployeePhoto(newId, photoFile)
        for (const doc of pendingDocs) await uploadEmployeeDocument(newId, doc.name, doc.file)
        navigate(`/employees/${newId}`)
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save employee'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  const photoSrc = photoPreview || (existingPhotoUrl ? `${API_BASE_URL}${existingPhotoUrl}` : null)
  const initials = form.full_name ? form.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'
  const otherEmployees = employees.filter((e) => e.id !== Number(id))

  const EmployeeSelect = ({ field, label }) => (
    <div className="field">
      <label>{label}</label>
      <select value={form[field]} onChange={set(field)}>
        <option value="">— None —</option>
        {otherEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.full_name}</option>)}
      </select>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/employees')}>
            ← Back to employees
          </button>
          <h1>{isEdit ? 'Edit Employee' : 'New Employee'}</h1>
          <p>Complete profile — matches your Frappe Employee doctype fields.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="profile-layout">
          <div className="profile-photo-card">
            <div className="photo-frame">
              {photoSrc ? <img src={photoSrc} alt="Employee" /> : initials}
            </div>
            <label className="photo-upload-btn">
              {photoSrc ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} />
            </label>
            <div className="profile-name">{form.full_name || 'New employee'}</div>
            <div className="profile-code">{form.employee_code || 'EMP-----'}</div>
          </div>

          <div>
            <div className="form-tabs">
              {TABS.map((t) => (
                <div key={t.key} className={`form-tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
                  {t.label}
                </div>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="form-section">
                <div className="form-section-body">
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Salutation</label>
                      <select value={form.salutation} onChange={set('salutation')}>
                        <option value="">—</option>
                        {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Employee ID</label>
                      <input value={form.employee_code} onChange={set('employee_code')} placeholder="EMP-0002" required />
                    </div>
                    <div className="field">
                      <label>Status</label>
                      <select value={form.status} onChange={set('status')}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid-3">
                    <div className="field">
                      <label>First name</label>
                      <input value={form.first_name} onChange={set('first_name')} />
                    </div>
                    <div className="field">
                      <label>Middle name</label>
                      <input value={form.middle_name} onChange={set('middle_name')} />
                    </div>
                    <div className="field">
                      <label>Last name</label>
                      <input value={form.last_name} onChange={set('last_name')} />
                    </div>
                  </div>
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Full name</label>
                      <input value={form.full_name} onChange={set('full_name')} required />
                    </div>
                    <div className="field">
                      <label>Father name</label>
                      <input value={form.father_name} onChange={set('father_name')} />
                    </div>
                    <div className="field">
                      <label>CNIC</label>
                      <input value={form.cnic} onChange={set('cnic')} placeholder="35202-1234567-1" />
                    </div>
                  </div>
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Gender</label>
                      <select value={form.gender} onChange={set('gender')}>
                        <option value="">—</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Date of birth</label>
                      <input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
                    </div>
                  </div>
                </div>
                <div className="form-section-header"><span className="num">2</span> Company Details</div>
                <div className="form-section-body">
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Company</label>
                      <select value={form.company_id} onChange={set('company_id')}>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Department</label>
                      <select value={form.department_id} onChange={set('department_id')}>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Designation</label>
                      <select value={form.designation_id} onChange={set('designation_id')}>
                        {designations.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Branch</label>
                      <input value={form.branch} onChange={set('branch')} />
                    </div>
                    <div className="field">
                      <label>Grade</label>
                      <input value={form.grade} onChange={set('grade')} placeholder="e.g. L2" />
                    </div>
                    <div className="field">
                      <label>Employment type</label>
                      <select value={form.employment_type} onChange={set('employment_type')}>
                        <option value="">—</option>
                        {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Shift</label>
                      <select value={form.shift_type_id} onChange={set('shift_type_id')}>
                        <option value="">—</option>
                        {shiftTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Joining date</label>
                      <input type="date" value={form.date_of_joining} onChange={set('date_of_joining')} required />
                    </div>
                    <div className="field">
                      <label>Contract expiry</label>
                      <input type="date" value={form.contract_expiry} onChange={set('contract_expiry')} />
                    </div>
                  </div>
                  <EmployeeSelect field="manager_id" label="Reports to (Manager)" />
                </div>
              </div>
            )}

            {activeTab === 'joining' && (
              <div className="form-section">
                <div className="form-section-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>Offer date</label>
                      <input type="date" value={form.offer_date} onChange={set('offer_date')} />
                    </div>
                    <div className="field">
                      <label>Confirmation date</label>
                      <input type="date" value={form.confirmation_date} onChange={set('confirmation_date')} />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>Notice (days)</label>
                      <input type="number" value={form.notice_days} onChange={set('notice_days')} />
                    </div>
                    <div className="field">
                      <label>Date of retirement</label>
                      <input type="date" value={form.date_of_retirement} onChange={set('date_of_retirement')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="form-section">
                <div className="form-section-header"><span className="num">1</span> Contact</div>
                <div className="form-section-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>Mobile</label>
                      <input value={form.phone} onChange={set('phone')} />
                    </div>
                    <div className="field">
                      <label>Company email</label>
                      <input type="email" value={form.email} onChange={set('email')} required />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>Personal email</label>
                      <input type="email" value={form.personal_email} onChange={set('personal_email')} />
                    </div>
                    <div className="field">
                      <label>Preferred contact email</label>
                      <select value={form.preferred_contact_email} onChange={set('preferred_contact_email')}>
                        <option value="">—</option>
                        <option value="Company Email">Company Email</option>
                        <option value="Personal Email">Personal Email</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="form-section-header"><span className="num">2</span> Address</div>
                <div className="form-section-body">
                  <div className="field">
                    <label>Current address</label>
                    <input value={form.current_address} onChange={set('current_address')} />
                  </div>
                  <div className="field">
                    <label>Current address is</label>
                    <select value={form.current_accommodation_type} onChange={set('current_accommodation_type')}>
                      <option value="">—</option>
                      {ACCOMMODATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Permanent address</label>
                    <input value={form.permanent_address} onChange={set('permanent_address')} />
                  </div>
                  <div className="field">
                    <label>Permanent address is</label>
                    <select value={form.permanent_accommodation_type} onChange={set('permanent_accommodation_type')}>
                      <option value="">—</option>
                      {ACCOMMODATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'emergency' && (
              <div className="form-section">
                <div className="form-section-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>Emergency contact name</label>
                      <input value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
                    </div>
                    <div className="field">
                      <label>Emergency phone</label>
                      <input value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Relation</label>
                    <input value={form.emergency_contact_relation} onChange={set('emergency_contact_relation')} placeholder="e.g. Brother, Spouse" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="form-section">
                <div className="form-section-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>Biometric ID (device enrollment ID)</label>
                      <input value={form.biometric_id} onChange={set('biometric_id')} />
                    </div>
                    <div className="field">
                      <label>Holiday list</label>
                      <select value={form.holiday_list_id} onChange={set('holiday_list_id')}>
                        <option value="">—</option>
                        {holidayLists.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                    <input type="checkbox" checked={form.allow_overtime} onChange={set('allow_overtime')} />
                    Allow Overtime
                  </label>
                </div>
                <div className="form-section-header"><span className="num">2</span> Approvers</div>
                <div className="form-section-body">
                  <EmployeeSelect field="expense_approver_id" label="Expense Approver" />
                  <EmployeeSelect field="leave_approver_id" label="Leave Approver" />
                  <EmployeeSelect field="shift_request_approver_id" label="Shift Request Approver" />
                </div>
              </div>
            )}

            {activeTab === 'salary' && (
              <div className="form-section">
                <div className="form-section-body">
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Basic Pay</label>
                      <input type="number" step="0.01" value={form.salary} onChange={set('salary')} />
                    </div>
                    <div className="field">
                      <label>Cost to Company (CTC)</label>
                      <input type="number" step="0.01" value={form.ctc} onChange={set('ctc')} />
                    </div>
                    <div className="field">
                      <label>Income Tax Amount</label>
                      <input type="number" step="0.01" value={form.income_tax_amount} onChange={set('income_tax_amount')} />
                    </div>
                  </div>
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Salary currency</label>
                      <input value={form.salary_currency} onChange={set('salary_currency')} />
                    </div>
                    <div className="field">
                      <label>Salary mode</label>
                      <select value={form.salary_mode} onChange={set('salary_mode')}>
                        <option value="">—</option>
                        {SALARY_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>Benefits notes</label>
                    <input value={form.benefits} onChange={set('benefits')} />
                  </div>
                </div>
                <div className="form-section-header"><span className="num">2</span> Bank Details</div>
                <div className="form-section-body">
                  <div className="form-grid-3">
                    <div className="field">
                      <label>Bank name</label>
                      <input value={form.bank_name} onChange={set('bank_name')} />
                    </div>
                    <div className="field">
                      <label>Bank A/C No.</label>
                      <input value={form.bank_account_no} onChange={set('bank_account_no')} />
                    </div>
                    <div className="field">
                      <label>IBAN</label>
                      <input value={form.iban} onChange={set('iban')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'benefits' && (
              <div className="form-section">
                <div className="form-section-body">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    <input type="checkbox" checked={form.medical_allow} onChange={set('medical_allow')} />
                    Medical Allow
                  </label>
                  <div className="form-grid">
                    <div className="field">
                      <label>Medical amount</label>
                      <input type="number" step="0.01" value={form.medical_amount} onChange={set('medical_amount')} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 12, marginTop: 8 }}>
                    <input type="checkbox" checked={form.gratuity_allow} onChange={set('gratuity_allow')} />
                    Gratuity Allow
                  </label>
                  <div className="form-grid">
                    <div className="field">
                      <label>Total gratuity</label>
                      <input type="number" step="0.01" value={form.total_gratuity} onChange={set('total_gratuity')} />
                    </div>
                    <div className="field">
                      <label>Consumed gratuity amount</label>
                      <input type="number" step="0.01" value={form.consumed_gratuity_amount} onChange={set('consumed_gratuity_amount')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="form-section">
                <div className="form-section-header"><span className="num">1</span> Personal Details</div>
                <div className="form-section-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>Marital status</label>
                      <select value={form.marital_status} onChange={set('marital_status')}>
                        <option value="">—</option>
                        {MARITAL_STATUS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Blood group</label>
                      <select value={form.blood_group} onChange={set('blood_group')}>
                        <option value="">—</option>
                        {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>Family background</label>
                    <input value={form.family_background} onChange={set('family_background')} />
                  </div>
                  <div className="field">
                    <label>Health details</label>
                    <input value={form.health_details} onChange={set('health_details')} />
                  </div>
                </div>
                <div className="form-section-header"><span className="num">2</span> Health Insurance</div>
                <div className="form-section-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>Provider</label>
                      <input value={form.health_insurance_provider} onChange={set('health_insurance_provider')} />
                    </div>
                    <div className="field">
                      <label>Policy No.</label>
                      <input value={form.health_insurance_no} onChange={set('health_insurance_no')} />
                    </div>
                  </div>
                </div>
                <div className="form-section-header"><span className="num">3</span> Passport Details</div>
                <div className="form-section-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>Passport number</label>
                      <input value={form.passport_number} onChange={set('passport_number')} />
                    </div>
                    <div className="field">
                      <label>Valid upto</label>
                      <input type="date" value={form.passport_valid_upto} onChange={set('passport_valid_upto')} />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>Date of issue</label>
                      <input type="date" value={form.passport_date_of_issue} onChange={set('passport_date_of_issue')} />
                    </div>
                    <div className="field">
                      <label>Place of issue</label>
                      <input value={form.passport_place_of_issue} onChange={set('passport_place_of_issue')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="form-section">
                <div className="form-section-body">
                  <div className="field">
                    <label>Bio / Cover Letter</label>
                    <textarea
                      value={form.bio}
                      onChange={set('bio')}
                      rows={6}
                      style={{ width: '100%', padding: 9, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exit' && (
              <div className="form-section">
                <div className="form-section-body">
                  <div className="form-grid">
                    <div className="field">
                      <label>Resignation letter date</label>
                      <input type="date" value={form.resignation_letter_date} onChange={set('resignation_letter_date')} />
                    </div>
                    <div className="field">
                      <label>Relieving date</label>
                      <input type="date" value={form.relieving_date} onChange={set('relieving_date')} />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>Exit interview held on</label>
                      <input type="date" value={form.exit_interview_date} onChange={set('exit_interview_date')} />
                    </div>
                    <div className="field">
                      <label>New workplace</label>
                      <input value={form.new_workplace} onChange={set('new_workplace')} />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>Leave encashed?</label>
                      <select value={form.leave_encashed} onChange={set('leave_encashed')}>
                        <option value="">—</option>
                        {YES_NO.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Encashment date</label>
                      <input type="date" value={form.encashment_date} onChange={set('encashment_date')} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Reason for leaving</label>
                    <input value={form.reason_for_leaving} onChange={set('reason_for_leaving')} />
                  </div>
                  <div className="field">
                    <label>Feedback</label>
                    <input value={form.exit_feedback} onChange={set('exit_feedback')} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="form-section">
                <div className="form-section-body">
                  {isEdit ? (
                    <>
                      {existingDocs.length === 0 && <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No documents uploaded yet.</div>}
                      {existingDocs.map((doc) => (
                        <div className="doc-row" key={doc.id}>
                          <div className="doc-icon">▤</div>
                          <div style={{ flex: 1 }}>
                            <div className="doc-name">{doc.document_name}</div>
                            <div className="doc-date">{new Date(doc.uploaded_at).toLocaleDateString()}</div>
                          </div>
                          <a className="btn btn-outline btn-sm" href={`${API_BASE_URL}${doc.file_url}`} target="_blank" rel="noreferrer">View</a>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeExistingDoc(doc.id)}>Remove</button>
                        </div>
                      ))}
                      <div className="add-doc-row">
                        <input type="text" placeholder="Document name" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
                        <input type="file" onChange={(e) => setNewDocFile(e.target.files[0])} />
                        <button type="button" className="btn btn-outline btn-sm" onClick={addDocToExistingEmployee}>Add</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {pendingDocs.length === 0 && <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No documents added yet — they'll upload once you save.</div>}
                      {pendingDocs.map((doc, i) => (
                        <div className="doc-row" key={i}>
                          <div className="doc-icon">▤</div>
                          <div style={{ flex: 1 }}>
                            <div className="doc-name">{doc.name}</div>
                            <div className="doc-date">{doc.file.name}</div>
                          </div>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => setPendingDocs(pendingDocs.filter((_, idx) => idx !== i))}>Remove</button>
                        </div>
                      ))}
                      <div className="add-doc-row">
                        <input type="text" placeholder="Document name" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
                        <input type="file" onChange={(e) => setNewDocFile(e.target.files[0])} />
                        <button type="button" className="btn btn-outline btn-sm" onClick={addPendingDoc}>Add</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="sticky-actions">
              <button type="button" className="btn btn-outline" onClick={() => navigate('/employees')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
