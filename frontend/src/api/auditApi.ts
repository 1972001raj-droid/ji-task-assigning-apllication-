import { apiClient } from './client';
import { AuditLogResponse } from '../types/audit';

export const auditApi = {
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
