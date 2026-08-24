import axiosClient from './axiosClient'

export const listTravelRequests = (params = {}) => axiosClient.get('/api/travel-requests/', { params })
export const getTravelRequest = (id) => axiosClient.get(`/api/travel-requests/${id}`)
export const createTravelRequest = (data) => axiosClient.post('/api/travel-requests/', data)
export const updateTravelRequest = (id, data) => axiosClient.put(`/api/travel-requests/${id}`, data)
export const deleteTravelRequest = (id) => axiosClient.delete(`/api/travel-requests/${id}`)
