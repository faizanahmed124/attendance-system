import axiosClient from './axiosClient'

export const listUsers = () => axiosClient.get('/api/auth/users')
export const getUser = (id) => axiosClient.get(`/api/auth/users/${id}`)
export const createUser = (data) => axiosClient.post('/api/auth/users', data)
export const updateUser = (id, data) => axiosClient.put(`/api/auth/users/${id}`, data)
export const resetUserPassword = (id, newPassword) =>
  axiosClient.post(`/api/auth/users/${id}/reset-password`, { new_password: newPassword })
export const deleteUser = (id) => axiosClient.delete(`/api/auth/users/${id}`)
