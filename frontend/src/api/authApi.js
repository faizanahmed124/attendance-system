import axiosClient from './axiosClient'

export const login = (email, password) =>
  axiosClient.post('/api/auth/login', { email, password })

export const getMe = () => axiosClient.get('/api/auth/me')
