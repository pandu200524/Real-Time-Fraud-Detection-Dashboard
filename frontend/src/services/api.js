import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  getCurrentUser: () => api.get('/api/auth/me'),
};

export const transactionAPI = {
  getTransactions: (params) => api.get('/api/transactions', { params }),
  getStats: () => api.get('/api/transactions/stats'),
  markAsReviewed: (id) => api.patch(`/api/transactions/${id}/review`),
  exportData: (data) => api.post('/api/transactions/export', data, { responseType: 'blob' }),
};

export default api;