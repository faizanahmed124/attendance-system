import axiosClient from './axiosClient'

export const listImportDoctypes = () => axiosClient.get('/api/data-import/doctypes')

export const downloadTemplate = (doctypeKey) =>
  axiosClient.get(`/api/data-import/${doctypeKey}/template`, { responseType: 'blob' })

export const exportData = (doctypeKey) =>
  axiosClient.get(`/api/data-import/${doctypeKey}/export`, { responseType: 'blob' })

export const importData = (doctypeKey, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axiosClient.post(`/api/data-import/${doctypeKey}/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
