import { apiGet, apiPost, apiPut, apiDelete } from './api';

const BASE = '/examinations';

export const listExamTypes = (token) => apiGet(`${BASE}/exam-types/`, token);
export const createExamType = (data, token) => apiPost(`${BASE}/exam-types/create/`, data, token);

export const listExaminations = (token) => apiGet(`${BASE}/`, token);
export const createExamination = (data, token) => apiPost(`${BASE}/create/`, data, token);
export const getExamination = (id, token) => apiGet(`${BASE}/${id}/`, token);
export const updateExamination = (id, data, token) => apiPut(`${BASE}/${id}/`, data, token);
export const deleteExamination = (id, token) => apiDelete(`${BASE}/${id}/`, token);
export const addExamSchedule = (id, data, token) => apiPost(`${BASE}/${id}/schedule/`, data, token);

export const listMarks = (examId, token) => apiGet(`${BASE}/${examId}/marks/`, token);
export const enterMarks = (examId, data, token) => apiPost(`${BASE}/${examId}/marks/enter/`, data, token);
export const updateMarks = (marksId, data, token) => apiPut(`${BASE}/marks/${marksId}/`, data, token);

export const myFinalGrades = (token) => apiGet(`${BASE}/final-grades/me/`, token);
export const myResults = (token) => apiGet(`${BASE}/results/me/`, token);
export const listResults = (token) => apiGet(`${BASE}/results/`, token);
export const publishResult = (id, token) => apiPost(`${BASE}/results/${id}/publish/`, {}, token);
export const approveResult = (id, token) => apiPost(`${BASE}/results/${id}/approve/`, {}, token);
export const computeSectionGrades = (sectionId, token) => apiPost(`${BASE}/sections/${sectionId}/compute-grades/`, {}, token);
export const unlockSectionMarks = (sectionId, data, token) => apiPost(`${BASE}/sections/${sectionId}/unlock-marks/`, data, token);