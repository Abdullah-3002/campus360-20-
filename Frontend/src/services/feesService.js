import { apiGet, apiPost } from './api';

const BASE = '/fees';

export const listFeeStructures = (token) => apiGet(`${BASE}/structures/`, token);
export const createFeeStructure = (data, token) => apiPost(`${BASE}/structures/create/`, data, token);

export const listChallans = (token) => apiGet(`${BASE}/challans/`, token);
export const myChallans = (token) => apiGet(`${BASE}/challans/me/`, token);
export const generateChallan = (data, token) => apiPost(`${BASE}/challans/generate/`, data, token);

export const recordPayment = (data, token) => apiPost(`${BASE}/payments/record/`, data, token);
export const listScholarships = (token) => apiGet(`${BASE}/scholarships/`, token);
