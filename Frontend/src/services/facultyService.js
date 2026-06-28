import { apiGet, apiPost, apiPut, apiDelete } from './api';

const BASE = '/faculty';

export const listDesignations = (token) => apiGet(`${BASE}/designations/`, token);
export const createDesignation = (data, token) => apiPost(`${BASE}/designations/create/`, data, token);

export const listFaculty = (token) => apiGet(`${BASE}/`, token);
export const createFaculty = (data, token) => apiPost(`${BASE}/create/`, data, token);
export const getFaculty = (id, token) => apiGet(`${BASE}/${id}/`, token);
export const updateFaculty = (id, data, token) => apiPut(`${BASE}/${id}/`, data, token);
export const getMyFacultyProfile = (token) => apiGet(`${BASE}/me/`, token);

export const listStaff = (token) => apiGet(`${BASE}/staff/`, token);
export const createStaff = (data, token) => apiPost(`${BASE}/staff/create/`, data, token);
