import axiosClient from './axiosClient'

export const globalSearch = (q) => axiosClient.get('/api/search/', { params: { q } })
