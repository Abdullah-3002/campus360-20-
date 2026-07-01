import { apiGet, apiPost, apiPut, apiDelete } from './api';

const BASE = '/attendance';

export const listAttendance = (token, params = '') => apiGet(`${BASE}/${params ? '?' + params : ''}`, token);
export const markAttendance = (data, token) => apiPost(`${BASE}/mark/`, data, token);
export const nextLectureNumber = (sectionId, token) => apiGet(`${BASE}/next-lecture/?section_id=${sectionId}`, token);
export const myAttendanceSummary = (token, courseId = '') => apiGet(`${BASE}/summary/me/${courseId ? '?course_id=' + courseId : ''}`, token);
export const listAttendanceSummaries = (token) => apiGet(`${BASE}/summary/`, token);
export const submitLeave = (data, token) => apiPost(`${BASE}/leaves/submit/`, data, token);
export const myLeaves = (token) => apiGet(`${BASE}/leaves/me/`, token);
export const deleteLeave = (id, token) => apiDelete(`${BASE}/leaves/${id}/`, token);
export const teacherLeaves = (token) => apiGet(`${BASE}/leaves/teacher/`, token);
export const reviewLeave = (id, data, token) => apiPost(`${BASE}/leaves/${id}/review/`, data, token);