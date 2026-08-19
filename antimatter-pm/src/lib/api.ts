import axios from 'axios';

// Create an Axios instance
export const api = axios.create({
  // Use localhost (not 127.0.0.1) so both the Vite dev server (localhost:5173)
  // and the backend (localhost:8000) share the same hostname — making them
  // same-site. This allows SameSite=lax session cookies to be sent on every
  // request. Using 127.0.0.1 vs localhost causes cross-site cookie blocking.
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true, // Crucial for sending/receiving session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach X-CSRF-Token header if present in localStorage
api.interceptors.request.use((config) => {
  const csrfToken = localStorage.getItem('csrf_token');
  if (csrfToken && config.headers) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response Interceptor: Handle 401 Unauthorized globally and update CSRF token
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.csrf_token) {
      localStorage.setItem('csrf_token', response.data.csrf_token);
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
