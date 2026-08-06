import { apiClient } from './client';
import {
  RoadmapItemResponse,
  TimelineItemResponse,
  BurndownResponse,
  TeamWorkloadResponse,
} from '../types/report';

export const reportApi = {
  getRoadmap: async (projectId: string): Promise<RoadmapItemResponse[]> => {
    const res = await apiClient.get<RoadmapItemResponse[]>(`/reports/roadmap?project_id=${projectId}`);
    return res.data;
  },

  getTimeline: async (projectId: string): Promise<TimelineItemResponse[]> => {
    const res = await apiClient.get<TimelineItemResponse[]>(`/reports/timeline?project_id=${projectId}`);
    return res.data;
  },

  getBurndown: async (sprintId: string): Promise<BurndownResponse> => {
    const res = await apiClient.get<BurndownResponse>(`/reports/burndown?sprint_id=${sprintId}`);
    return res.data;
  },

  getWorkload: async (projectId: string): Promise<TeamWorkloadResponse> => {
    const res = await apiClient.get<TeamWorkloadResponse>(`/reports/workload?project_id=${projectId}`);
    return res.data;
  },

  downloadIssuesCsv: async (projectId: string): Promise<Blob> => {
    const res = await apiClient.get(`/reports/export/issues?project_id=${projectId}`, {
      responseType: 'blob',
    });
    return res.data;
  },
};
