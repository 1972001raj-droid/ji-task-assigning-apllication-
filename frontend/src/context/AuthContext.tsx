import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginRequest } from '../types/auth';
import { authApi } from '../api/authApi';
import { registerUnauthorizedHandler, setCsrfToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  toggleDarkMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-mode');
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const u = await authApi.getMe();
      setUser(u);
      applyTheme(u.dark_mode_enabled);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
      setCsrfToken(null);
    });
    refreshUser();
  }, []);

  const login = async (credentials: LoginRequest): Promise<User> => {
    setLoading(true);
    try {
      const res = await authApi.login(credentials);
      setUser(res.user);
      applyTheme(res.user.dark_mode_enabled);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const toggleDarkMode = async () => {
    if (!user) return;
    const nextDark = !user.dark_mode_enabled;
    setUser({ ...user, dark_mode_enabled: nextDark });
    applyTheme(nextDark);
    try {
      await authApi.updatePreferences({ dark_mode_enabled: nextDark });
    } catch (err) {
      console.error('Failed to update dark mode preference:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, toggleDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
