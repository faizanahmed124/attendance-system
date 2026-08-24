import axiosClient from './axiosClient'

export const listImportDoctypes = () => axiosClient.get('/api/data-import/doctypes')
export const getDoctypeFields = (doctype) => axiosClient.get(`/api/data-import/doctypes/${doctype}/fields`)

export const downloadTemplate = (doctype, fields) =>
  axiosClient.get(`/api/data-import/doctypes/${doctype}/template`, {
    params: { fields: fields.join(',') },
    responseType: 'blob',
  })

export const exportDoctypeData = (doctype, fields) =>
  axiosClient.get(`/api/data-import/doctypes/${doctype}/export`, {
    params: { fields: fields.join(',') },
    responseType: 'blob',
  })

export const importDoctypeData = (doctype, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axiosClient.post(`/api/data-import/doctypes/${doctype}/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
