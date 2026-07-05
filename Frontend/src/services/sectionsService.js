import { apiGet, apiPost, apiPut, apiDelete } from './api';

const BASE = '/sections';

export const listSections = (token, all = false) => apiGet(`${BASE}/${all ? '?all=1' : ''}`, token);
export const createSection = (data, token) => apiPost(`${BASE}/create/`, data, token);
export const updateSection = (id, data, token) => apiPut(`${BASE}/${id}/`, data, token);
export const getSection = (id, token) => apiGet(`${BASE}/${id}/`, token);
export const getMySections = (token, params = '') => apiGet(`${BASE}/me/${params ? '?' + params : ''}`, token);
export const submitFinalMarks = (sectionId, token) => apiPost(`${BASE}/${sectionId}/submit-marks/`, {}, token);
export const getSectionStudents = (sectionId, token) => apiGet(`${BASE}/${sectionId}/students/`, token);
export const addSchedule = (id, data, token) => apiPost(`${BASE}/${id}/schedules/`, data, token);
export const listBatchSections = (token) => apiGet(`${BASE}/batch/`, token);
export const createBatchSection = (data, token) => apiPost(`${BASE}/batch/`, data, token);
export const deleteBatchSection = (id, token) => apiDelete(`${BASE}/batch/${id}/`, token);
