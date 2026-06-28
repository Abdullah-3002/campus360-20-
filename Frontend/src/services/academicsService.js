import { apiGet, apiPost, apiPut, apiDelete } from './api';

const BASE = '/academics';

export const listDepartments = (token) => apiGet(`${BASE}/departments/`, token);
export const createDepartment = (data, token) => apiPost(`${BASE}/departments/create/`, data, token);
export const getDepartment = (id, token) => apiGet(`${BASE}/departments/${id}/`, token);
export const updateDepartment = (id, data, token) => apiPut(`${BASE}/departments/${id}/`, data, token);

export const listPrograms = (token) => apiGet(`${BASE}/programs/`, token);
export const createProgram = (data, token) => apiPost(`${BASE}/programs/create/`, data, token);
export const getProgram = (id, token) => apiGet(`${BASE}/programs/${id}/`, token);

export const listSemesters = (token) => apiGet(`${BASE}/semesters/`, token);
export const getCurrentSemester = (token) => apiGet(`${BASE}/semesters/current/`, token);
export const createSemester = (data, token) => apiPost(`${BASE}/semesters/create/`, data, token);

export const listCourses = (token) => apiGet(`${BASE}/courses/`, token);
export const createCourse = (data, token) => apiPost(`${BASE}/courses/create/`, data, token);
export const getCourse = (id, token) => apiGet(`${BASE}/courses/${id}/`, token);
