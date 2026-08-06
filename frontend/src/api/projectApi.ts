import { apiClient } from './client';
import {
  Organization,
  OrganizationCreate,
  Project,
  ProjectCreate,
  ProjectMembership,
  ProjectMembershipCreate,
  ProjectEstimationSettings,
  ProjectEstimationSettingsUpdate,
} from '../types/project';

export const projectApi = {
  listOrganizations: async (): Promise<Organization[]> => {
    const res = await apiClient.get<Organization[]>('/organizations');
    return res.data;
  },

  createOrganization: async (data: OrganizationCreate): Promise<Organization> => {
    const res = await apiClient.post<Organization>('/organizations', data);
    return res.data;
  },

  listProjects: async (): Promise<Project[]> => {
    const res = await apiClient.get<Project[]>('/projects');
    return res.data;
  },

  createProject: async (data: ProjectCreate): Promise<Project> => {
    const res = await apiClient.post<Project>('/projects', data);
    return res.data;
  },

  getEstimationSettings: async (projectId: string): Promise<ProjectEstimationSettings> => {
    const res = await apiClient.get<ProjectEstimationSettings>(`/projects/${projectId}/estimation-settings`);
    return res.data;
  },

  updateEstimationSettings: async (
    projectId: string,
    data: ProjectEstimationSettingsUpdate
  ): Promise<ProjectEstimationSettings> => {
    const res = await apiClient.put<ProjectEstimationSettings>(`/projects/${projectId}/estimation-settings`, data);
    return res.data;
  },

  addMember: async (projectId: string, data: ProjectMembershipCreate): Promise<ProjectMembership> => {
    const res = await apiClient.post<ProjectMembership>(`/memberships?project_id=${projectId}`, data);
    return res.data;
  },
};
