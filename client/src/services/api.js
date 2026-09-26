import axios from 'axios';

// Determine API Base URL from environment or fall back to /api for local dev proxy
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) {
    return '/api';
  }
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for attaching auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('purchaseflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401 & formatting error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Clear token and redirect to login if session expired (avoid infinite loops on /login)
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('purchaseflow_token');
        localStorage.removeItem('purchaseflow_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
