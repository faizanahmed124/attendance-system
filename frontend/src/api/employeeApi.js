import axiosClient from './axiosClient'

export const listEmployees = (params = {}) => axiosClient.get('/api/employees/', { params })
export const getEmployee = (id) => axiosClient.get(`/api/employees/${id}`)
export const createEmployee = (data) => axiosClient.post('/api/employees/', data)
export const updateEmployee = (id, data) => axiosClient.put(`/api/employees/${id}`, data)
export const deleteEmployee = (id) => axiosClient.delete(`/api/employees/${id}`)

export const uploadEmployeePhoto = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axiosClient.post(`/api/employees/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const listEmployeeDocuments = (id) => axiosClient.get(`/api/employees/${id}/documents`)

export const uploadEmployeeDocument = (id, documentName, file) => {
  const formData = new FormData()
  formData.append('document_name', documentName)
  formData.append('file', file)
  return axiosClient.post(`/api/employees/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteEmployeeDocument = (employeeId, documentId) =>
  axiosClient.delete(`/api/employees/${employeeId}/documents/${documentId}`)

export const bulkUpdateEmployees = (ids, updates) => axiosClient.post('/api/employees/bulk-update', { ids, updates })
export const bulkDeleteEmployees = (ids) => axiosClient.post('/api/employees/bulk-delete', { ids, updates: {} })
