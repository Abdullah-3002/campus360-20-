import { apiGet } from './api';

export const listAuditLogs = (token, table = '') => {
  const qs = table ? `?table=${encodeURIComponent(table)}` : '';
  return apiGet(`/audit-logs/${qs}`, token);
};
