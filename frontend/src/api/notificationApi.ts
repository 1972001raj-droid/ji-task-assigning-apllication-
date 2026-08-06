import { apiClient } from './client';
import { NotificationResponse, AuditLogResponse } from '../types/notification';

export const notificationApi = {
  listNotifications: async (unreadOnly: boolean = false): Promise<NotificationResponse[]> => {
    const res = await apiClient.get<NotificationResponse[]>(`/notifications?unread_only=${unreadOnly}`);
    return res.data;
  },

  markRead: async (notificationId: string): Promise<{ success: boolean }> => {
    const res = await apiClient.patch<{ success: boolean }>(`/notifications/${notificationId}/read`);
    return res.data;
  },

  listAuditLogs: async (
    orgId?: string,
    projectId?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<AuditLogResponse[]> => {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    if (orgId) params.append('org_id', orgId);
    if (projectId) params.append('project_id', projectId);

    const res = await apiClient.get<AuditLogResponse[]>(`/audit-logs?${params.toString()}`);
    return res.data;
  },
};
