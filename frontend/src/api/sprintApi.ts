import { apiClient } from './client';
import { Sprint, SprintCreate, BoardResponse } from '../types/sprint';

export const sprintApi = {
  createSprint: async (data: SprintCreate): Promise<Sprint> => {
    const res = await apiClient.post<Sprint>('/sprints', data);
    return res.data;
  },

  listSprints: async (projectId: string): Promise<Sprint[]> => {
    const res = await apiClient.get<Sprint[]>(`/sprints?project_id=${projectId}`);
    return res.data;
  },

  addIssueToSprint: async (sprintId: string, issueId: string): Promise<string[]> => {
    const res = await apiClient.post<string[]>(`/sprints/${sprintId}/issues`, { issue_id: issueId });
    return res.data;
  },

  getBoard: async (projectId: string, sprintId?: string): Promise<BoardResponse> => {
    const params = new URLSearchParams({ project_id: projectId });
    if (sprintId) params.append('sprint_id', sprintId);
    const res = await apiClient.get<BoardResponse>(`/boards?${params.toString()}`);
    return res.data;
  },
};
