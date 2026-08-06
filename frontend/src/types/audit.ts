export interface AuditLogResponse {
  id: string;
  user_id?: string | null;
  org_id?: string | null;
  project_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  request_id?: string | null;
  created_at: string;
}
