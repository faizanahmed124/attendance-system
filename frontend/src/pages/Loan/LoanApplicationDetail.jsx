import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { getLoanApplication, updateLoanApplication, convertApplicationToLoan, deleteLoanApplication, listLoanTypes } from '../../api/loanApi'
import { listEmployees } from '../../api/employeeApi'
import { listCompanies } from '../../api/companyApi'

export default function LoanApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loanType, setLoanType] = useState(null)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertCompanyId, setConvertCompanyId] = useState('')
  const [converting, setConverting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    getLoanApplication(id)
      .then(async (res) => {
        setApplication(res.data)
        try {
          const [empRes, typeRes, compRes] = await Promise.all([listEmployees(), listLoanTypes(), listCompanies()])
          setEmployee(empRes.data.find((e) => e.id === res.data.employee_id))
          setLoanType(typeRes.data.find((t) => t.id === res.data.loan_type_id))
          setCompanies(compRes.data)
          setConvertCompanyId(res.data.company_id || compRes.data[0]?.id || '')
        } catch (innerErr) {
          console.error('Could not load related details:', innerErr)
        }
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load application'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleStatusChange = async (status) => {
    setError('')
    try {
      const res = await updateLoanApplication(id, { status })
      setApplication(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update status')
    }
  }

  const handleConvert = async () => {
    setConverting(true)
    setError('')
    try {
      const res = await convertApplicationToLoan(id, { company_id: Number(convertCompanyId) })
      navigate(`/loans/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not convert to loan')
    } finally {
      setConverting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteLoanApplication(id)
      navigate('/loans/applications')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete application')
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !application) return <div className="error-banner">{error}</div>
  if (!application) return null

  const statusPillType = (status) => {
    if (status === 'Approved') return 'active'
    if (status === 'Rejected') return 'inactive'
    return 'Pending'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 10 }} onClick={() => navigate('/loans/applications')}>
            ← Back to applications
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Loan Application · #{application.id}
            <span style={{ fontSize: 12 }}><StatusPill status={statusPillType(application.status)} /></span>
          </h1>
          <p>{employee ? `${employee.employee_code} — ${employee.full_name}` : `Employee #${application.employee_id}`} · {loanType?.name || ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {application.status === 'Open' && (
            <>
              <button className="btn btn-primary" onClick={() => handleStatusChange('Approved')}>Approve</button>
              <button className="btn btn-danger" onClick={() => handleStatusChange('Rejected')}>Reject</button>
            </>
          )}
          {application.status === 'Approved' && !application.loan_id && (
            <button className="btn btn-primary" onClick={() => setShowConvertModal(true)}>Create Loan</button>
          )}
          {application.loan_id && (
            <button className="btn btn-outline" onClick={() => navigate(`/loans/${application.loan_id}`)}>View Loan →</button>
          )}
          {!application.loan_id && (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-section">
        <div className="form-section-header"><span className="num">1</span> Loan Request</div>
        <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
          <DetailRow label="Amount Requested" value={<span className="mono">{application.loan_amount.toLocaleString()}</span>} />
          <DetailRow label="Repayment Period" value={`${application.repayment_periods} months`} />
          <DetailRow label="Interest Rate" value={application.rate_of_interest != null ? `${application.rate_of_interest}% (override)` : `${loanType?.interest_rate ?? '—'}% (loan type default)`} />
          <DetailRow label="Applied On" value={<span className="mono">{application.application_date}</span>} />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">2</span> Dates</div>
        <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
          <DetailRow label="Requested Disbursement Date" value={application.requested_disbursement_date || '—'} />
          <DetailRow label="Repayment Start Date" value={application.repayment_start_date || '—'} />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">3</span> Disbursement Account</div>
        <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
          <DetailRow label="Bank Name" value={application.bank_name || '—'} />
          <DetailRow label="Bank Account No." value={application.bank_account_no || '—'} />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">4</span> Guarantor</div>
        <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
          <DetailRow label="Name" value={application.guarantor_name || '—'} />
          <DetailRow label="Contact" value={application.guarantor_contact || '—'} />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header"><span className="num">5</span> Additional Information</div>
        <div className="form-section-body" style={{ display: 'grid', gap: 12 }}>
          <DetailRow label="Reason" value={application.reason || '—'} />
          <DetailRow label="HR Remarks" value={application.hr_remarks || '—'} />
        </div>
      </div>

      {showConvertModal && (
        <Modal
          title="Create Loan from Application"
          onClose={() => setShowConvertModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowConvertModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConvert} disabled={converting}>
                {converting ? 'Creating…' : 'Create Loan'}
              </button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
            This will sanction a loan of <strong>{application.loan_amount.toLocaleString()}</strong> over{' '}
            <strong>{application.repayment_periods} months</strong>. The EMI is calculated automatically.
          </p>
          <div className="field">
            <label>Company</label>
            <select value={convertCompanyId} onChange={(e) => setConvertCompanyId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Delete this application?</h3></div>
            <div className="modal-body">This can't be undone.</div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
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
