import { apiGet, apiPost, apiPut } from './api';

const BASE = '/sections';

export const listSections = (token) => apiGet(`${BASE}/`, token);
export const createSection = (data, token) => apiPost(`${BASE}/create/`, data, token);
export const getSection = (id, token) => apiGet(`${BASE}/${id}/`, token);
export const getMySections = (token, params = '') => apiGet(`${BASE}/me/${params ? '?' + params : ''}`, token);
export const submitFinalMarks = (sectionId, token) => apiPost(`${BASE}/${sectionId}/submit-marks/`, {}, token);
export const getSectionStudents = (sectionId, token) => apiGet(`${BASE}/${sectionId}/students/`, token);
export const addSchedule = (id, data, token) => apiPost(`${BASE}/${id}/schedules/`, data, token);
