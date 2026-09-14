import axiosClient from './axiosClient'

export const getAttendanceSettings = () => axiosClient.get('/api/attendance-settings/')
export const updateAttendanceSettings = (data) => axiosClient.put('/api/attendance-settings/', data)
