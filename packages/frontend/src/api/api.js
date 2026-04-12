// packages/frontend/src/api/api.js
// Axios instance pre-configured with the base URL and JWT injection.
// All API calls in the app import from here — never use raw axios.

import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
  timeout: 15000, // 15-second timeout
});

// ── Request interceptor: inject the access token ──────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bc_access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 globally ────────────────────────
// If the server returns 401 with code TOKEN_EXPIRED, attempt a refresh.
// If that fails, clear storage and redirect to /login.
api.interceptors.response.use(
  response => response, // Pass through successful responses unchanged
  async (error) => {
    const original = error.config;
    const status   = error.response?.status;
    const code     = error.response?.data?.code;

    // Only retry once; skip refresh-token endpoint itself to avoid loops
    if (status === 401 && code === 'TOKEN_EXPIRED' && !original._retried) {
      original._retried = true;
      try {
        const refreshToken = localStorage.getItem('bc_refresh');
        const { data } = await axios.post(
          (import.meta.env.VITE_API_URL || '') + '/api/auth/refresh',
          { refreshToken }
        );
        localStorage.setItem('bc_access',  data.accessToken);
        localStorage.setItem('bc_refresh', data.refreshToken);
        // Retry the original request with the new token
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed — force logout
        localStorage.removeItem('bc_access');
        localStorage.removeItem('bc_refresh');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
