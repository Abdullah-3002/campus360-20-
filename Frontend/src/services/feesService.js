import { apiGet, apiPost } from './api';

const BASE = '/fees';

export const listFeeStructures = (token) => apiGet(`${BASE}/structures/`, token);
export const createFeeStructure = (data, token) => apiPost(`${BASE}/structures/create/`, data, token);

export const listChallans = (token) => apiGet(`${BASE}/challans/`, token);
export const myChallans = (token) => apiGet(`${BASE}/challans/me/`, token);
export const generateChallan = (data, token) => apiPost(`${BASE}/challans/generate/`, data, token);
export const generateSemesterChallans = (data, token) => apiPost(`${BASE}/challans/generate-bulk/`, data, token);

export const listPayments = (token, verified = '') => {
  const qs = verified ? `?verified=${verified}` : '';
  return apiGet(`${BASE}/payments/${qs}`, token);
};
export const recordPayment = (data, token) => apiPost(`${BASE}/payments/record/`, data, token);
export const verifyPayment = (id, data, token) => apiPost(`${BASE}/payments/${id}/verify/`, data, token);

export const listScholarships = (token) => apiGet(`${BASE}/scholarships/`, token);
export const createScholarship = (data, token) => apiPost(`${BASE}/scholarships/`, data, token);
