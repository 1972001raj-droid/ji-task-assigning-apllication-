import { SystemRole } from './auth';

export type EstimationScheme = 'FIBONACCI' | 'TSHIRT' | 'HOURS';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationCreate {
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  key: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  org_id: string;
  name: string;
  key: string;
  description?: string;
}

export interface ProjectMembership {
  id: string;
  project_id: string;
  user_id: string;
  role: SystemRole;
  created_at: string;
}

export interface ProjectMembershipCreate {
  user_id: string;
  role: SystemRole;
}

export interface ProjectEstimationSettings {
  id: string;
  project_id: string;
  scheme: EstimationScheme;
  allowed_values: string[];
}

export interface ProjectEstimationSettingsUpdate {
  scheme: EstimationScheme;
  allowed_values: string[];
}
