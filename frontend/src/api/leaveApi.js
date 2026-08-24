import axiosClient from './axiosClient'

// Leave Types
export const listLeaveTypes = () => axiosClient.get('/api/leaves/types')
export const createLeaveType = (data) => axiosClient.post('/api/leaves/types', data)
export const updateLeaveType = (id, data) => axiosClient.put(`/api/leaves/types/${id}`, data)
export const deleteLeaveType = (id) => axiosClient.delete(`/api/leaves/types/${id}`)

// Leave Allocations
export const listLeaveAllocations = (params = {}) => axiosClient.get('/api/leaves/allocations', { params })
export const createLeaveAllocation = (data) => axiosClient.post('/api/leaves/allocations', data)
export const deleteLeaveAllocation = (id) => axiosClient.delete(`/api/leaves/allocations/${id}`)

// Leave Balance
export const getLeaveBalance = (employeeId) => axiosClient.get('/api/leaves/balance', { params: { employee_id: employeeId } })

// Leave Applications
export const listLeaveApplications = (params = {}) => axiosClient.get('/api/leaves/applications', { params })
export const getLeaveApplication = (id) => axiosClient.get(`/api/leaves/applications/${id}`)
export const createLeaveApplication = (data) => axiosClient.post('/api/leaves/applications', data)
export const updateLeaveApplication = (id, data) => axiosClient.put(`/api/leaves/applications/${id}`, data)
export const deleteLeaveApplication = (id) => axiosClient.delete(`/api/leaves/applications/${id}`)
