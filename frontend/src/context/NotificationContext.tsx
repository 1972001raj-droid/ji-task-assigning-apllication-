import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationResponse } from '../types/notification';
import { notificationApi } from '../api/notificationApi';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationResponse[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);

  const refreshNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const list = await notificationApi.listNotifications(false);
      setNotifications(list);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    refreshNotifications();
    if (user) {
      const interval = setInterval(refreshNotifications, 30000); // 30s poll
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refreshNotifications, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};
