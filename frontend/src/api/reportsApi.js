import axiosClient from './axiosClient'

export const listReports = () => axiosClient.get('/api/reports/')
export const runReport = (key, filters = {}) => axiosClient.get(`/api/reports/${key}/run`, { params: filters })
