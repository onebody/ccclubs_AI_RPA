import axios from 'axios';
import { getToken, logout } from '../utils/auth';

const BASE_URL = '/api/v1';

const instance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => instance.post('/auth/login', data),
  register: (data) => instance.post('/auth/register', data),
};

export const tenantApi = {
  getAll: () => instance.get('/tenants'),
  getById: (id) => instance.get(`/tenants/${id}`),
  create: (data) => instance.post('/tenants', data),
  update: (id, data) => instance.put(`/tenants/${id}`, data),
  delete: (id) => instance.delete(`/tenants/${id}`),
};

export const processConfigApi = {
  getAll: () => instance.get('/process-configs'),
  getById: (id) => instance.get(`/process-configs/${id}`),
  create: (data) => instance.post('/process-configs', data),
  update: (id, data) => instance.put(`/process-configs/${id}`, data),
  delete: (id) => instance.delete(`/process-configs/${id}`),
};

export const taskApi = {
  getAll: () => instance.get('/tasks'),
  getById: (id) => instance.get(`/tasks/${id}`),
  create: (data) => instance.post('/tasks', data),
  update: (id, data) => instance.put(`/tasks/${id}`, data),
  delete: (id) => instance.delete(`/tasks/${id}`),
  execute: (id) => instance.post(`/tasks/${id}/execute`),
};

export default instance;