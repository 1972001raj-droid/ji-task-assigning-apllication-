export interface NotificationResponse {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogResponse {
  id: string;
  actor_id?: string | null;
  org_id?: string | null;
  project_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}
