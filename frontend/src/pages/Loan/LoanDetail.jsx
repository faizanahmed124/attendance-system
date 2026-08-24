import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Wallet, Percent, Calendar, TrendingDown, Coins, FileText, Download,
  ArrowUpRight, PiggyBank, PieChart,
} from 'lucide-react'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { getLoan, createDisbursement, recordRepayment } from '../../api/loanApi'
import { listEmployees } from '../../api/employeeApi'
import { listLoanTypes } from '../../api/loanApi'
import { listAccounts } from '../../api/accountsApi'

export default function LoanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loan, setLoan] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loanType, setLoanType] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showDisburseModal, setShowDisburseModal] = useState(false)
  const [disburseForm, setDisburseForm] = useState({ disbursement_account_id: '', payment_account_id: '' })
  const [disbursing, setDisbursing] = useState(false)

  const [showRepayModal, setShowRepayModal] = useState(false)
  const [repayAmount, setRepayAmount] = useState('')
  const [repaying, setRepaying] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. The loan itself - this is the only thing that must succeed for
      // the page to render at all.
      const loanRes = await getLoan(id)
      setLoan(loanRes.data)
      setRepayAmount(String(loanRes.data.monthly_repayment_amount))

      // 2. Employee + Loan Type - needed for the header/labels, but we
      // still want the page to render even if one of these has an issue.
      try {
        const [empRes, typeRes] = await Promise.all([listEmployees(), listLoanTypes()])
        setEmployee(empRes.data.find((e) => e.id === loanRes.data.employee_id))
        setLoanType(typeRes.data.find((t) => t.id === loanRes.data.loan_type_id))
      } catch (innerErr) {
        console.error('Could not load employee/loan-type details:', innerErr)
      }

      // 3. Chart of Accounts - ONLY needed for the "Disburse Loan" modal's
      // account dropdowns. Kept isolated so that if this one call fails
      // (e.g. a permissions issue on the "accounts" module for the
      // current role), it never blocks the rest of the loan page from
      // showing - you just won't get ledger-posting dropdowns.
      try {
        const accRes = await listAccounts()
        setAccounts(accRes.data.filter((a) => !a.is_group))
      } catch (innerErr) {
        console.error('Could not load chart of accounts (disbursement ledger posting will be unavailable):', innerErr)
      }
    } catch (err) {
      console.error('Could not load loan:', err)
      setError(err.response?.data?.detail || 'Could not load loan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [id])

  const handleDisburse = async () => {
    setDisbursing(true)
    setError('')
    try {
      await createDisbursement(id, {
        disbursement_account_id: disburseForm.disbursement_account_id ? Number(disburseForm.disbursement_account_id) : null,
        payment_account_id: disburseForm.payment_account_id ? Number(disburseForm.payment_account_id) : null,
      })
      setShowDisburseModal(false)
      loadAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not disburse loan')
    } finally {
      setDisbursing(false)
    }
  }

  const handleRepay = async () => {
    setRepaying(true)
    setError('')
    try {
      await recordRepayment(id, { amount_paid: Number(repayAmount) })
      setShowRepayModal(false)
      loadAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not record repayment')
    } finally {
      setRepaying(false)
    }
  }

  const handleDownloadHistory = () => {
    const header = 'Date,Amount Paid,Principal,Interest,Balance After\n'
    const rows = loan.repayments
      .map((r) => `${r.payment_date},${r.amount_paid},${r.principal_amount},${r.interest_amount},${r.balance_after}`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loan-${loan.id}-repayments.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="card card-pad">Loading…</div>
  if (error && !loan) return <div className="error-banner">{error}</div>
  if (!loan) return null

  const initials = employee ? employee.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'
  const progressPct = loan.loan_amount > 0 ? Math.round((loan.total_principal_paid / loan.loan_amount) * 100) : 0

  const statusPillType = (status) => {
    if (status === 'Repaid') return 'active'
    if (status === 'Sanctioned') return 'Pending'
    return 'Present'
  }

  const metaRows = [
    { icon: Coins, label: 'Principal', value: loan.loan_amount.toLocaleString() },
    { icon: Percent, label: 'Interest Rate', value: `${loan.rate_of_interest}% p.a.` },
    { icon: Calendar, label: 'Term', value: `${loan.repayment_periods} months` },
    { icon: Wallet, label: 'EMI', value: loan.monthly_repayment_amount.toLocaleString() },
    { icon: TrendingDown, label: 'Balance', value: loan.balance_amount.toLocaleString() },
  ]

  const summaryCards = [
    { icon: Wallet, label: 'Total Payable', value: loan.total_payable.toLocaleString(), tone: 'blue' },
    { icon: ArrowUpRight, label: 'Total Paid So Far', value: loan.total_amount_paid.toLocaleString(), tone: 'green' },
    { icon: PieChart, label: 'Outstanding', value: loan.balance_amount.toLocaleString(), tone: 'purple' },
    { icon: Percent, label: 'Interest Rate', value: `${loan.rate_of_interest}% p.a.`, tone: 'orange' },
  ]

  const toneColors = {
    blue: { bg: '#EAF0FF', fg: '#1E4FD8' },
    green: { bg: '#E9F9EF', fg: '#1E8E4E' },
    purple: { bg: '#F1ECFE', fg: '#7C4FE0' },
    orange: { bg: '#FFF3E4', fg: '#C6720D' },
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 8px' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm " style={{ marginBottom: 10 }} onClick={() => navigate('/loans')}>
            
            ← Back to loans
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Loan · #{loan.id}
            <span style={{ fontSize: 12 }}><StatusPill status={statusPillType(loan.status)} /></span>
          </h1>
          <p>{employee ? `${employee.employee_code} — ${employee.full_name}` : `Employee #${loan.employee_id}`} · {loanType?.name || ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {loan.status === 'Sanctioned' && (
            <button className="btn btn-primary" onClick={() => setShowDisburseModal(true)}>
              <Wallet size={14} style={{ marginRight: 6 }} /> Disburse Loan
            </button>
          )}
          {loan.status === 'Disbursed' && (
            <button className="btn btn-primary" onClick={() => setShowRepayModal(true)}>
              <PiggyBank size={14} style={{ marginRight: 6 }} /> Record Repayment
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="profile-layout" style={{ gap: 28 }}>
        <div className="profile-photo-card">
          <div className="photo-frame">{initials}</div>
          <div className="profile-name">{employee?.full_name || `Employee #${loan.employee_id}`}</div>
          <div className="profile-code">{employee?.employee_code || ''}</div>
          <div style={{ marginTop: 10 }}><StatusPill status={employee?.status || 'active'} /></div>

          <div className="profile-meta">
            {metaRows.map((row) => (
              <div className="row" key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <row.icon size={13} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{row.label}</span>
                <span className="mono">{row.value}</span>
              </div>
            ))}
          </div>

          {loan.status !== 'Sanctioned' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 6 }}>
                <span>Repaid</span><span>{progressPct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--primary)', borderRadius: 999 }} />
              </div>
            </div>
          )}

          <button className="btn btn-outline btn-sm full-width" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled title="Loan document attachments aren't wired up yet">
            <FileText size={13} /> View Loan Documents
          </button>
        </div>

        <div>
          <div className="form-section">
            <div className="form-section-header"><span className="num">1</span> Loan Overview</div>
            <div className="form-section-body">
              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                <DetailRow label="Total Payable (principal + interest)" value={<span className="mono">{loan.total_payable.toLocaleString()}</span>} />
                <DetailRow label="Total Interest Payable" value={<span className="mono">{loan.total_interest_payable.toLocaleString()}</span>} />
                <DetailRow label="Total Paid So Far" value={<span className="mono">{loan.total_amount_paid.toLocaleString()}</span>} />
                <DetailRow label="Principal Paid" value={<span className="mono">{loan.total_principal_paid.toLocaleString()}</span>} />
                <DetailRow label="Interest Paid" value={<span className="mono">{loan.total_interest_paid.toLocaleString()}</span>} />
                <DetailRow label="Disbursement Date" value={loan.disbursement_date || '— not yet disbursed —'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {summaryCards.map((c) => {
                  const colors = toneColors[c.tone]
                  return (
                    <div key={c.label} style={{ background: colors.bg, borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.fg }}>
                          <c.icon size={14} />
                        </div>
                        <span style={{ fontSize: 11.5, color: colors.fg, fontWeight: 600 }}>{c.label}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: colors.fg }}>{c.value}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <span className="num">2</span> Repayment History
              {loan.repayments.length > 0 && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={handleDownloadHistory}
                >
                  <Download size={13} /> Download
                </button>
              )}
            </div>
            <div className="form-section-body">
              {loan.repayments.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                  {loan.status === 'Sanctioned' ? 'This loan has not been disbursed yet.' : 'No repayments recorded yet.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount Paid</th>
                        <th>Principal</th>
                        <th>Interest</th>
                        <th>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loan.repayments.map((r) => (
                        <tr key={r.id}>
                          <td className="mono">{r.payment_date}</td>
                          <td className="mono">{r.amount_paid.toLocaleString()}</td>
                          <td className="mono">{r.principal_amount.toLocaleString()}</td>
                          <td className="mono">{r.interest_amount.toLocaleString()}</td>
                          <td className="mono">{r.balance_after.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDisburseModal && (
        <Modal
          title="Disburse Loan"
          onClose={() => setShowDisburseModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowDisburseModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDisburse} disabled={disbursing}>
                {disbursing ? 'Disbursing…' : `Disburse ${loan.loan_amount.toLocaleString()}`}
              </button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
            Marks this loan as Disbursed. Optionally post it to the ledger by choosing both accounts below - leave them blank to just record the disbursement without a journal entry.
          </p>
          <div className="field">
            <label>Loan Receivable Account (debit, optional)</label>
            <select value={disburseForm.disbursement_account_id} onChange={(e) => setDisburseForm({ ...disburseForm, disbursement_account_id: e.target.value })}>
              <option value="">— Skip ledger posting —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Paid From Account (credit, optional)</label>
            <select value={disburseForm.payment_account_id} onChange={(e) => setDisburseForm({ ...disburseForm, payment_account_id: e.target.value })}>
              <option value="">— Skip ledger posting —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {showRepayModal && (
        <Modal
          title="Record Repayment"
          onClose={() => setShowRepayModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowRepayModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRepay} disabled={repaying}>
                {repaying ? 'Saving…' : 'Record Payment'}
              </button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <label>Amount Paid</label>
            <input type="number" step="0.01" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} autoFocus />
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
            Suggested EMI: {loan.monthly_repayment_amount.toLocaleString()} · Remaining balance: {loan.balance_amount.toLocaleString()}
          </p>
        </Modal>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13.5 }}>{value}</span>
    </div>
  )
}