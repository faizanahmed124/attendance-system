import axiosClient from './axiosClient'

export const listNotifications = (unreadOnly = false) => axiosClient.get('/api/notifications/', { params: { unread_only: unreadOnly } })
export const getUnreadCount = () => axiosClient.get('/api/notifications/unread-count')
export const markAsRead = (id) => axiosClient.put(`/api/notifications/${id}/read`)
export const markAllAsRead = () => axiosClient.put('/api/notifications/mark-all-read')
