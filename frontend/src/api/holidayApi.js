import axiosClient from './axiosClient'

export const listHolidayLists = (params = {}) => axiosClient.get('/api/holiday-lists/', { params })
export const getHolidayList = (id) => axiosClient.get(`/api/holiday-lists/${id}`)
export const createHolidayList = (data) => axiosClient.post('/api/holiday-lists/', data)
export const addHoliday = (holidayListId, data) => axiosClient.post(`/api/holiday-lists/${holidayListId}/holidays`, data)
export const updateHolidayList = (id, data) => axiosClient.put(`/api/holiday-lists/${id}`, data)
export const deleteHolidayList = (id) => axiosClient.delete(`/api/holiday-lists/${id}`)
