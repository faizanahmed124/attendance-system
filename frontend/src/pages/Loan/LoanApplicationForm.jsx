import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLoanApplication, listLoanTypes } from '../../api/loanApi'
import { listEmployees } from '../../api/employeeApi'
import { listCompanies } from '../../api/companyApi'

const emptyForm = {
  employee_id: '', company_id: '', loan_type_id: '',
  loan_amount: '', repayment_periods: 12, rate_of_interest: '',
  requested_disbursement_date: '', repayment_start_date: '',
  bank_name: '', bank_account_no: '',
  guarantor_name: '', guarantor_contact: '',
  reason: '', hr_remarks: '',
}

export default function LoanApplicationForm() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [companies, setCompanies] = useState([])
  const [loanTypes, setLoanTypes] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listEmployees(), listCompanies(), listLoanTypes()])
      .then(([empRes, compRes, typeRes]) => {
        setEmployees(empRes.data)
        setCompanies(compRes.data)
        setLoanTypes(typeRes.data.filter((t) => t.is_active))
        setForm((f) => ({
          ...f,
          company_id: compRes.data[0]?.id || '',
          loan_type_id: typeRes.data[0]?.id || '',
        }))
      })
      .finally(() => setLoading(false))
  }, [])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const selectedType = loanTypes.find((t) => t.id === Number(form.loan_type_id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        employee_id: Number(form.employee_id),
        company_id: form.company_id ? Number(form.company_id) : null,
        loan_type_id: Number(form.loan_type_id),
        loan_amount: Number(form.loan_amount),
        repayment_periods: Number(form.repayment_periods),
        rate_of_interest: form.rate_of_interest === '' ? null : Number(form.rate_of_interest),
        requested_disbursement_date: form.requested_disbursement_date || null,
        repayment_start_date: form.repayment_start_date || null,
      }
      const res = await createLoanApplication(payload)
      navigate(`/loans/applications/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit application')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/loans/applications')}>
            ← Back to applications
          </button>
          <h1>New Loan Application</h1>
          <p>Full request details - amount, term, disbursement, and guarantor information.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {employees.length === 0 || loanTypes.length === 0 ? (
        <div className="error-banner">
          {loanTypes.length === 0 ? 'Create a Loan Type first.' : 'No employees found.'}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Applicant &amp; Loan</div>
            <div className="form-section-body">
              <div className="form-grid">
                <div className="field">
                  <label>Employee</label>
                  <select value={form.employee_id} onChange={set('employee_id')} required>
                    <option value="">— Select —</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Company</label>
                  <select value={form.company_id} onChange={set('company_id')}>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Loan Type</label>
                  <select value={form.loan_type_id} onChange={set('loan_type_id')} required>
                    {loanTypes.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.interest_rate}%)</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Interest Rate Override (optional)</label>
                  <input type="number" step="0.01" value={form.rate_of_interest} onChange={set('rate_of_interest')} placeholder={`Default: ${selectedType?.interest_rate ?? 0}%`} />
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Amount Requested</label>
                  <input type="number" step="0.01" value={form.loan_amount} onChange={set('loan_amount')} required />
                  {selectedType?.max_loan_amount && (
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Max for this loan type: {selectedType.max_loan_amount.toLocaleString()}</span>
                  )}
                </div>
                <div className="field">
                  <label>Repayment Period (months)</label>
                  <input type="number" value={form.repayment_periods} onChange={set('repayment_periods')} required />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">2</span> Dates</div>
            <div className="form-section-body">
              <div className="form-grid">
                <div className="field">
                  <label>Requested Disbursement Date</label>
                  <input type="date" value={form.requested_disbursement_date} onChange={set('requested_disbursement_date')} />
                </div>
                <div className="field">
                  <label>Repayment Start Date</label>
                  <input type="date" value={form.repayment_start_date} onChange={set('repayment_start_date')} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">3</span> Disbursement Account</div>
            <div className="form-section-body">
              <div className="form-grid">
                <div className="field">
                  <label>Bank Name</label>
                  <input value={form.bank_name} onChange={set('bank_name')} />
                </div>
                <div className="field">
                  <label>Bank Account No.</label>
                  <input value={form.bank_account_no} onChange={set('bank_account_no')} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">4</span> Guarantor (optional)</div>
            <div className="form-section-body">
              <div className="form-grid">
                <div className="field">
                  <label>Guarantor Name</label>
                  <input value={form.guarantor_name} onChange={set('guarantor_name')} />
                </div>
                <div className="field">
                  <label>Guarantor Contact</label>
                  <input value={form.guarantor_contact} onChange={set('guarantor_contact')} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><span className="num">5</span> Additional Information</div>
            <div className="form-section-body">
              <div className="field">
                <label>Reason for Loan</label>
                <textarea
                  value={form.reason}
                  onChange={set('reason')}
                  rows={3}
                  style={{ width: '100%', padding: 9, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
                />
              </div>
              <div className="field">
                <label>HR Remarks (internal)</label>
                <textarea
                  value={form.hr_remarks}
                  onChange={set('hr_remarks')}
                  rows={2}
                  style={{ width: '100%', padding: 9, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
                />
              </div>
            </div>
          </div>

          <div className="sticky-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/loans/applications')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
