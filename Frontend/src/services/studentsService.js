import { apiGet, apiPost, apiPut } from './api';

const BASE = '/students';

export const listStudents = (token) => apiGet(`${BASE}/`, token);
export const createStudent = (data, token) => apiPost(`${BASE}/create/`, data, token);
export const getStudent = (id, token) => apiGet(`${BASE}/${id}/`, token);
export const updateStudentStatus = (id, data, token) => apiPut(`${BASE}/${id}/status/`, data, token);
export const getMyStudentProfile = (token) => apiGet(`${BASE}/me/`, token);
export const updateMyStudentProfile = (data, token) => apiPut(`${BASE}/me/profile/`, data, token);
