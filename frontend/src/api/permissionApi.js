import axiosClient from './axiosClient'

export const getPermissionMeta = () => axiosClient.get('/api/permissions/meta')
export const listPermissions = () => axiosClient.get('/api/permissions/')
export const bulkUpdatePermissions = (permissions) =>
  axiosClient.put('/api/permissions/bulk', { permissions })

export const listUsers = () => axiosClient.get('/api/auth/users')
export const updateUser = (id, data) => axiosClient.put(`/api/auth/users/${id}`, data)
