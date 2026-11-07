import axios from 'axios';

/**
 * Single Axios instance for the whole frontend.
 * Development: Vite proxies /api to localhost:5000.
 * Production: Requests go directly to the Render backend.
 */
const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL
    ? `${API_URL.replace(/\/+$/, '')}/api`
    : '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aquatrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      const hadToken = Boolean(localStorage.getItem('aquatrack_token'));
      localStorage.removeItem('aquatrack_token');
      localStorage.removeItem('aquatrack_user');

      if (hadToken) {
        window.dispatchEvent(new Event('aquatrack:unauthorized'));
      }
    }

    return Promise.reject(error);
  }
);

export default api;