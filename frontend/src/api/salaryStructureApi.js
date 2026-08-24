import axiosClient from './axiosClient'

// Salary Components
export const listSalaryComponents = () => axiosClient.get('/api/salary-structure/components')
export const createSalaryComponent = (data) => axiosClient.post('/api/salary-structure/components', data)
export const updateSalaryComponent = (id, data) => axiosClient.put(`/api/salary-structure/components/${id}`, data)
export const deleteSalaryComponent = (id) => axiosClient.delete(`/api/salary-structure/components/${id}`)

// Salary Structures
export const listSalaryStructures = () => axiosClient.get('/api/salary-structure/structures')
export const getSalaryStructure = (id) => axiosClient.get(`/api/salary-structure/structures/${id}`)
export const createSalaryStructure = (data) => axiosClient.post('/api/salary-structure/structures', data)
export const updateSalaryStructure = (id, data) => axiosClient.put(`/api/salary-structure/structures/${id}`, data)
export const deleteSalaryStructure = (id) => axiosClient.delete(`/api/salary-structure/structures/${id}`)

// Salary Structure Assignments
export const listAssignments = (params = {}) => axiosClient.get('/api/salary-structure/assignments', { params })
export const createAssignment = (data) => axiosClient.post('/api/salary-structure/assignments', data)
export const deleteAssignment = (id) => axiosClient.delete(`/api/salary-structure/assignments/${id}`)

// Salary calculation preview
export const calculateSalaryPreview = (params) => axiosClient.get('/api/salary-structure/calculate', { params })
