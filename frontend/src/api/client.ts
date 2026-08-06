import axios, { AxiosError } from 'axios';

let csrfToken: string | null = localStorage.getItem('csrf_token');

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
  if (token) {
    localStorage.setItem('csrf_token', token);
  } else {
    localStorage.removeItem('csrf_token');
  }
};

export const getCsrfToken = () => csrfToken;

export interface NormalizedApiError {
  message: string;
  details?: Record<string, unknown> | unknown[];
  request_id?: string;
  status?: number;
}

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.error?.message) {
      return data.error.message;
    }
    if (data?.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
      }
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please try again.';
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

let onUnauthorizedCallback: (() => void) | null = null;

export const registerUnauthorizedHandler = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    return Promise.reject(error);
  }
);
