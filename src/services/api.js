import axios from 'axios';

/**
 * Single Axios instance for the whole frontend.
 * During development Vite proxies /api to http://localhost:5000,
 * so no absolute URL is needed and CORS stays simple.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT saved by the auth context (wired in Phase 4).
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
      // Let AuthContext clear React state so protected routes redirect immediately.
      if (hadToken) window.dispatchEvent(new Event('aquatrack:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
