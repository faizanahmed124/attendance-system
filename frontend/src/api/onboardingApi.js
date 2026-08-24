import axiosClient from './axiosClient'

// Employee Onboarding
export const listOnboardings = (params = {}) => axiosClient.get('/api/onboarding/onboardings', { params })
export const getOnboarding = (id) => axiosClient.get(`/api/onboarding/onboardings/${id}`)
export const createOnboarding = (data) => axiosClient.post('/api/onboarding/onboardings', data)
export const updateOnboarding = (id, data) => axiosClient.put(`/api/onboarding/onboardings/${id}`, data)
export const deleteOnboarding = (id) => axiosClient.delete(`/api/onboarding/onboardings/${id}`)
export const toggleOnboardingActivity = (activityId, data) => axiosClient.put(`/api/onboarding/onboarding-activities/${activityId}`, data)

// Employee Separation (Offboarding)
export const listSeparations = (params = {}) => axiosClient.get('/api/onboarding/separations', { params })
export const getSeparation = (id) => axiosClient.get(`/api/onboarding/separations/${id}`)
export const createSeparation = (data) => axiosClient.post('/api/onboarding/separations', data)
export const updateSeparation = (id, data) => axiosClient.put(`/api/onboarding/separations/${id}`, data)
export const deleteSeparation = (id) => axiosClient.delete(`/api/onboarding/separations/${id}`)
export const toggleSeparationActivity = (activityId, data) => axiosClient.put(`/api/onboarding/separation-activities/${activityId}`, data)
