import axiosClient from './axiosClient'

// Loan Types
export const listLoanTypes = () => axiosClient.get('/api/loans/types')
export const createLoanType = (data) => axiosClient.post('/api/loans/types', data)
export const updateLoanType = (id, data) => axiosClient.put(`/api/loans/types/${id}`, data)
export const deleteLoanType = (id) => axiosClient.delete(`/api/loans/types/${id}`)

// Loan Applications
export const listLoanApplications = (params = {}) => axiosClient.get('/api/loans/applications', { params })
export const getLoanApplication = (id) => axiosClient.get(`/api/loans/applications/${id}`)
export const createLoanApplication = (data) => axiosClient.post('/api/loans/applications', data)
export const updateLoanApplication = (id, data) => axiosClient.put(`/api/loans/applications/${id}`, data)
export const deleteLoanApplication = (id) => axiosClient.delete(`/api/loans/applications/${id}`)
export const convertApplicationToLoan = (id, data) => axiosClient.post(`/api/loans/applications/${id}/convert-to-loan`, data)

// Loans
export const listLoans = (params = {}) => axiosClient.get('/api/loans/', { params })
export const getLoan = (id) => axiosClient.get(`/api/loans/${id}`)
export const createLoan = (data) => axiosClient.post('/api/loans/', data)
export const deleteLoan = (id) => axiosClient.delete(`/api/loans/${id}`)

// Disbursements
export const createDisbursement = (loanId, data) => axiosClient.post(`/api/loans/${loanId}/disbursements`, data)

// Repayments
export const recordRepayment = (loanId, data) => axiosClient.post(`/api/loans/${loanId}/repayments`, data)
