import { apiGet, apiPost, apiDelete } from './api';

const BASE = '/enrollments';

export const listEnrollments = (token) => apiGet(`${BASE}/`, token);
export const myEnrollments = (token) => apiGet(`${BASE}/me/`, token);
export const registerCourses = (data, token) => apiPost(`${BASE}/register/`, data, token);
export const dropCourse = (id, token) => apiDelete(`${BASE}/drop/${id}/`, token);
