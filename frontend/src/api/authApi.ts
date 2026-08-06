import { apiClient, setCsrfToken } from './client';
import { LoginRequest, LoginResponse, User, AuthSession, UserPreferenceUpdate } from '../types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', data);
    if (res.data.csrf_token) {
      setCsrfToken(res.data.csrf_token);
    }
    return res.data;
  },

  logout: async (): Promise<{ message: string }> => {
    try {
      const res = await apiClient.post<{ message: string }>('/auth/logout');
      return res.data;
    } finally {
      setCsrfToken(null);
    }
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/me');
    return res.data;
  },

  updatePreferences: async (data: UserPreferenceUpdate): Promise<{ message: string; dark_mode_enabled: boolean }> => {
    const res = await apiClient.patch('/me/preferences', data);
    return res.data;
  },

  listSessions: async (): Promise<AuthSession[]> => {
    const res = await apiClient.get<AuthSession[]>('/auth/sessions');
    return res.data;
  },

  revokeSession: async (sessionId: string): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/auth/sessions/${sessionId}`);
    return res.data;
  },
};
