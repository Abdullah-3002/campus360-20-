import { apiGet, apiPost } from './api';

const BASE = '/attendance';

export const listAttendance = (token) => apiGet(`${BASE}/`, token);
export const markAttendance = (data, token) => apiPost(`${BASE}/mark/`, data, token);
export const myAttendanceSummary = (token) => apiGet(`${BASE}/summary/me/`, token);
export const listAttendanceSummaries = (token) => apiGet(`${BASE}/summary/`, token);
