import axios from 'axios';

export const BASE_URL = 'http://localhost:8000/api';

export const getAuthHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

export const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  return data?.results || [];
};

export const apiGet = async (url, token) => {
  const response = await axios.get(`${BASE_URL}${url}`, getAuthHeader(token));
  return response.data;
};

export const apiPost = async (url, data, token) => {
  const response = await axios.post(`${BASE_URL}${url}`, data, getAuthHeader(token));
  return response.data;
};

export const apiPut = async (url, data, token) => {
  const response = await axios.put(`${BASE_URL}${url}`, data, getAuthHeader(token));
  return response.data;
};

export const apiDelete = async (url, token) => {
  const response = await axios.delete(`${BASE_URL}${url}`, getAuthHeader(token));
  return response.data;
};
