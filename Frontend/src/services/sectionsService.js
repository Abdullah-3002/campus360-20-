import { apiGet, apiPost, apiPut } from './api';

const BASE = '/sections';

export const listSections = (token) => apiGet(`${BASE}/`, token);
export const createSection = (data, token) => apiPost(`${BASE}/create/`, data, token);
export const getSection = (id, token) => apiGet(`${BASE}/${id}/`, token);
export const getMySections = (token) => apiGet(`${BASE}/me/`, token);
export const addSchedule = (id, data, token) => apiPost(`${BASE}/${id}/schedules/`, data, token);
