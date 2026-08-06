export type SystemRole = 'ADMIN' | 'MANAGER' | 'DEVELOPER';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  dark_mode_enabled: boolean;
  roles?: SystemRole[];
  dashboard_route?: string;
  projects?: { id: string; name: string; key: string }[];
}

export interface LoginRequest {
  username_or_email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  csrf_token: string;
  message: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  is_current: boolean;
}

export interface UserPreferenceUpdate {
  dark_mode_enabled?: boolean;
  full_name?: string;
}
