import { apiClient } from './client';
import {
  Issue,
  IssueDetail,
  IssueCreate,
  IssueUpdate,
  IssueTransitionRequest,
  IssueComment,
  IssueCommentCreate,
  AcceptanceCriteria,
  AcceptanceCriteriaCreate,
  AcceptanceCriteriaUpdate,
} from '../types/issue';

export const issueApi = {
  createIssue: async (data: IssueCreate): Promise<Issue> => {
    const res = await apiClient.post<Issue>('/issues', data);
    return res.data;
  },

  getIssueDetail: async (issueId: string): Promise<IssueDetail> => {
    const res = await apiClient.get<IssueDetail>(`/issues/${issueId}`);
    return res.data;
  },

  updateIssue: async (issueId: string, data: IssueUpdate): Promise<Issue> => {
    const res = await apiClient.put<Issue>(`/issues/${issueId}`, data);
    return res.data;
  },

  transitionIssue: async (issueId: string, data: IssueTransitionRequest): Promise<Issue> => {
    const res = await apiClient.post<Issue>(`/issues/${issueId}/transition`, data);
    return res.data;
  },

  addComment: async (issueId: string, data: IssueCommentCreate): Promise<IssueComment> => {
    const res = await apiClient.post<IssueComment>(`/issues/${issueId}/comments`, data);
    return res.data;
  },

  addAcceptanceCriteria: async (
    issueId: string,
    data: AcceptanceCriteriaCreate
  ): Promise<AcceptanceCriteria> => {
    const res = await apiClient.post<AcceptanceCriteria>(`/issues/${issueId}/acceptance-criteria`, data);
    return res.data;
  },

  updateAcceptanceCriteria: async (
    acId: string,
    data: AcceptanceCriteriaUpdate
  ): Promise<AcceptanceCriteria> => {
    const res = await apiClient.patch<AcceptanceCriteria>(`/acceptance-criteria/${acId}`, data);
    return res.data;
  },
};
