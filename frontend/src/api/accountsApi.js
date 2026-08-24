import axiosClient from './axiosClient'

// Chart of Accounts
export const listAccounts = (params = {}) => axiosClient.get('/api/accounts/', { params })
export const getAccount = (id) => axiosClient.get(`/api/accounts/${id}`)
export const createAccount = (data) => axiosClient.post('/api/accounts/', data)
export const updateAccount = (id, data) => axiosClient.put(`/api/accounts/${id}`, data)
export const deleteAccount = (id) => axiosClient.delete(`/api/accounts/${id}`)
export const getAccountLedger = (id) => axiosClient.get(`/api/accounts/${id}/ledger`)

// Cost Centers
export const listCostCenters = (params = {}) => axiosClient.get('/api/accounts/cost-centers/list', { params })
export const createCostCenter = (data) => axiosClient.post('/api/accounts/cost-centers', data)

// Journal Entries
export const listJournalEntries = (params = {}) => axiosClient.get('/api/accounts/journal-entries/list', { params })
export const getJournalEntry = (id) => axiosClient.get(`/api/accounts/journal-entries/${id}`)
export const createJournalEntry = (data) => axiosClient.post('/api/accounts/journal-entries', data)
export const deleteJournalEntry = (id) => axiosClient.delete(`/api/accounts/journal-entries/${id}`)

// Expense Claims
export const listExpenseClaims = (params = {}) => axiosClient.get('/api/accounts/expense-claims/list', { params })
export const getExpenseClaim = (id) => axiosClient.get(`/api/accounts/expense-claims/${id}`)
export const createExpenseClaim = (data) => axiosClient.post('/api/accounts/expense-claims', data)
export const updateExpenseClaim = (id, data) => axiosClient.put(`/api/accounts/expense-claims/${id}`, data)
export const deleteExpenseClaim = (id) => axiosClient.delete(`/api/accounts/expense-claims/${id}`)
export const postExpenseToJournal = (id, data) => axiosClient.post(`/api/accounts/expense-claims/${id}/post`, data)

// Salary Postings
export const listSalaryPostings = (params = {}) => axiosClient.get('/api/accounts/salary-postings/list', { params })
export const createSalaryPosting = (data) => axiosClient.post('/api/accounts/salary-postings', data)
