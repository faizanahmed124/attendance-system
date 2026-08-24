import axiosClient from './axiosClient'

export const getSystemSettings = () => axiosClient.get('/api/system-settings/')
export const updateSystemSettings = (data) => axiosClient.put('/api/system-settings/', data)
