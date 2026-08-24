import axiosClient from './axiosClient'

// Job Openings
export const listJobOpenings = (params = {}) => axiosClient.get('/api/recruitment/job-openings', { params })
export const getJobOpening = (id) => axiosClient.get(`/api/recruitment/job-openings/${id}`)
export const createJobOpening = (data) => axiosClient.post('/api/recruitment/job-openings', data)
export const updateJobOpening = (id, data) => axiosClient.put(`/api/recruitment/job-openings/${id}`, data)
export const deleteJobOpening = (id) => axiosClient.delete(`/api/recruitment/job-openings/${id}`)

// Applicants
export const listApplicants = (params = {}) => axiosClient.get('/api/recruitment/applicants', { params })
export const getApplicant = (id) => axiosClient.get(`/api/recruitment/applicants/${id}`)
export const createApplicant = (data) => axiosClient.post('/api/recruitment/applicants', data)
export const updateApplicant = (id, data) => axiosClient.put(`/api/recruitment/applicants/${id}`, data)
export const deleteApplicant = (id) => axiosClient.delete(`/api/recruitment/applicants/${id}`)

export const uploadResume = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axiosClient.post(`/api/recruitment/applicants/${id}/resume`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// Interviews
export const addInterview = (applicantId, data) => axiosClient.post(`/api/recruitment/applicants/${applicantId}/interviews`, data)
export const updateInterview = (applicantId, interviewId, data) =>
  axiosClient.put(`/api/recruitment/applicants/${applicantId}/interviews/${interviewId}`, data)
export const deleteInterview = (applicantId, interviewId) =>
  axiosClient.delete(`/api/recruitment/applicants/${applicantId}/interviews/${interviewId}`)

// Convert to Employee
export const convertToEmployee = (applicantId, data) =>
  axiosClient.post(`/api/recruitment/applicants/${applicantId}/convert-to-employee`, data)
