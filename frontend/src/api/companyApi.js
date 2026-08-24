import axiosClient from './axiosClient'

export const listCompanies = () => axiosClient.get('/api/companies/')
export const createCompany = (data) => axiosClient.post('/api/companies/', data)
export const updateCompany = (id, data) => axiosClient.put(`/api/companies/${id}`, data)
export const deleteCompany = (id) => axiosClient.delete(`/api/companies/${id}`)
