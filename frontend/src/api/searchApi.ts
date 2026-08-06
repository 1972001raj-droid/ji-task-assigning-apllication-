import { apiClient } from './client';
import { Issue, IssueStatus, IssueType, IssuePriority } from '../types/issue';

export interface SearchIssuesParams {
  project_id: string;
  q?: string;
  status?: IssueStatus;
  issue_type?: IssueType;
  priority?: IssuePriority;
  assignee_id?: string;
  sprint_id?: string;
  skip?: number;
  limit?: number;
}

export interface SearchIssuesResult {
  total: number;
  skip: number;
  limit: number;
  items: Issue[];
}

export const searchApi = {
  searchIssues: async (params: SearchIssuesParams): Promise<SearchIssuesResult> => {
    const searchParams = new URLSearchParams({ project_id: params.project_id });
    if (params.q) searchParams.append('q', params.q);
    if (params.status) searchParams.append('status', params.status);
    if (params.issue_type) searchParams.append('issue_type', params.issue_type);
    if (params.priority) searchParams.append('priority', params.priority);
    if (params.assignee_id) searchParams.append('assignee_id', params.assignee_id);
    if (params.sprint_id) searchParams.append('sprint_id', params.sprint_id);
    if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());

    const res = await apiClient.get<SearchIssuesResult>(`/search/issues?${searchParams.toString()}`);
    return res.data;
  },
};
