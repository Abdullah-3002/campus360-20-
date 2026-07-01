import { apiGet, apiPost, apiPut } from './api';

const BASE = '/notifications';

export const listNotifications = (token) => apiGet(`${BASE}/`, token);
export const markNotificationRead = (id, token) => apiPost(`${BASE}/${id}/read/`, {}, token);
export const markAllRead = (token) => apiPost(`${BASE}/read-all/`, {}, token);

export const listAnnouncements = (token) => apiGet(`${BASE}/announcements/`, token);
export const createAnnouncement = (data, token) => apiPost(`${BASE}/announcements/create/`, data, token);
export const getAnnouncementTargetOptions = (token) => apiGet(`${BASE}/announcements/target-options/`, token);
export const sendNotification = (data, token) => apiPost(`${BASE}/admin/send/`, data, token);

export const listNotificationTypes = (token) => apiGet(`${BASE}/types/`, token);
export const createNotificationType = (data, token) => apiPost(`${BASE}/types/create/`, data, token);
