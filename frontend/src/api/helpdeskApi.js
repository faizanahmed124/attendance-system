import axiosClient from './axiosClient'

export const listTickets = (params = {}) => axiosClient.get('/api/helpdesk/tickets', { params })
export const getTicket = (id) => axiosClient.get(`/api/helpdesk/tickets/${id}`)
export const createTicket = (data) => axiosClient.post('/api/helpdesk/tickets', data)
export const updateTicket = (id, data) => axiosClient.put(`/api/helpdesk/tickets/${id}`, data)
export const deleteTicket = (id) => axiosClient.delete(`/api/helpdesk/tickets/${id}`)
export const addComment = (ticketId, data) => axiosClient.post(`/api/helpdesk/tickets/${ticketId}/comments`, data)
