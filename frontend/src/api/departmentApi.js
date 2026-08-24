import axiosClient from './axiosClient'

export const listDepartments = (params = {}) => axiosClient.get('/api/departments/', { params })
export const getDepartment = (id) => axiosClient.get(`/api/departments/${id}`)
export const createDepartment = (data) => axiosClient.post('/api/departments/', data)
export const updateDepartment = (id, data) => axiosClient.put(`/api/departments/${id}`, data)
export const deleteDepartment = (id) => axiosClient.delete(`/api/departments/${id}`)

export const bulkUpdateDepartments = (ids, updates) => axiosClient.post('/api/departments/bulk-update', { ids, updates })
export const bulkDeleteDepartments = (ids) => axiosClient.post('/api/departments/bulk-delete', { ids, updates: {} })
