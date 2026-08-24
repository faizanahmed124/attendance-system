import axiosClient from './axiosClient'

export const listDesignations = () => axiosClient.get('/api/designations/')
export const createDesignation = (data) => axiosClient.post('/api/designations/', data)
export const updateDesignation = (id, data) => axiosClient.put(`/api/designations/${id}`, data)
export const deleteDesignation = (id) => axiosClient.delete(`/api/designations/${id}`)
