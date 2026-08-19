import axios from 'axios';

// Create an Axios instance
export const api = axios.create({
  // Vite forwards this same-origin path to FastAPI in development. This also
  // makes a single tunnel URL work for both the UI and the API.
  baseURL: '/api/v1',
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
