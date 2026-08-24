import axiosClient from './axiosClient'

export const listRecognitions = (employeeId) => axiosClient.get('/api/recognition/', { params: employeeId ? { employee_id: employeeId } : {} })
export const createRecognition = (data) => axiosClient.post('/api/recognition/', data)
export const deleteRecognition = (id) => axiosClient.delete(`/api/recognition/${id}`)
export const getLeaderboard = () => axiosClient.get('/api/recognition/leaderboard')
