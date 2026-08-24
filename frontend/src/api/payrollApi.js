import axiosClient from './axiosClient'

// Payroll Entries
export const listPayrollEntries = (params = {}) => axiosClient.get('/api/payroll/entries', { params })
export const getPayrollEntry = (id) => axiosClient.get(`/api/payroll/entries/${id}`)
export const createPayrollEntry = (data) => axiosClient.post('/api/payroll/entries', data)
export const deletePayrollEntry = (id) => axiosClient.delete(`/api/payroll/entries/${id}`)
export const postPayrollToJournal = (id, data) => axiosClient.post(`/api/payroll/entries/${id}/post-to-journal`, data)

// Salary Slips
export const listSalarySlips = (params = {}) => axiosClient.get('/api/payroll/salary-slips', { params })
export const getSalarySlip = (id) => axiosClient.get(`/api/payroll/salary-slips/${id}`)
export const createStandaloneSalarySlip = (data) => axiosClient.post('/api/payroll/salary-slips', data)
export const deleteSalarySlip = (id) => axiosClient.delete(`/api/payroll/salary-slips/${id}`)
export const addSlipComponent = (slipId, data) => axiosClient.post(`/api/payroll/salary-slips/${slipId}/components`, data)
export const removeSlipComponent = (slipId, componentId) => axiosClient.delete(`/api/payroll/salary-slips/${slipId}/components/${componentId}`)
export const submitSalarySlip = (id) => axiosClient.post(`/api/payroll/salary-slips/${id}/submit`)
export const markSalarySlipPaid = (id) => axiosClient.post(`/api/payroll/salary-slips/${id}/mark-paid`)
