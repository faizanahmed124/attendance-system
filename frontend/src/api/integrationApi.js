import axiosClient from './axiosClient'

// Biometric Devices
export const listBiometricDevices = (params = {}) => axiosClient.get('/api/integration/biometric-devices', { params })
export const createBiometricDevice = (data) => axiosClient.post('/api/integration/biometric-devices', data)
export const updateBiometricDevice = (id, data) => axiosClient.put(`/api/integration/biometric-devices/${id}`, data)
export const deleteBiometricDevice = (id) => axiosClient.delete(`/api/integration/biometric-devices/${id}`)
export const syncBiometricDeviceNow = (id) => axiosClient.post(`/api/integration/biometric-devices/${id}/sync-now`)

// CCTV Cameras
export const listCCTVCameras = (params = {}) => axiosClient.get('/api/integration/cctv-cameras', { params })
export const createCCTVCamera = (data) => axiosClient.post('/api/integration/cctv-cameras', data)
export const updateCCTVCamera = (id, data) => axiosClient.put(`/api/integration/cctv-cameras/${id}`, data)
export const deleteCCTVCamera = (id) => axiosClient.delete(`/api/integration/cctv-cameras/${id}`)
