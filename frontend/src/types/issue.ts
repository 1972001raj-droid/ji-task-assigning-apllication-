import { User } from './auth';

export type IssueType = 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUBTASK';
export type IssueStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'IN_REVIEW' | 'DONE';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';

export interface AcceptanceCriteria {
  id: string;
  story_id: string;
  description: string;
  is_completed: boolean;
  completed_by_id?: string | null;
  completed_at?: string | null;
  position: number;
  created_at: string;
}

export interface AcceptanceCriteriaCreate {
  description: string;
  position?: number;
}

export interface AcceptanceCriteriaUpdate {
  description?: string;
  is_completed?: boolean;
  position?: number;
}

export interface IssueComment {
  id: string;
  issue_id: string;
  author_id: string;
  author?: User | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface IssueCommentCreate {
  content: string;
}

export interface Issue {
  id: string;
  project_id: string;
  issue_type: IssueType;
  status: IssueStatus;
  parent_issue_id?: string | null;
  title: string;
  description?: string | null;
  priority: IssuePriority;
  estimate?: string | null;
  assignee_id?: string | null;
  reporter_id: string;
  position: number;
  version: number;
  start_date?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  effective_epic_id?: string | null;
}

export interface IssueDetail extends Issue {
  assignee?: User | null;
  reporter?: User | null;
  acceptance_criteria: AcceptanceCriteria[];
  comments: IssueComment[];
  is_eligible_for_review: boolean;
  is_eligible_for_done: boolean;
}

export interface IssueCreate {
  project_id: string;
  issue_type: IssueType;
  title: string;
  description?: string;
  priority?: IssuePriority;
  estimate?: string;
  parent_issue_id?: string;
  assignee_id?: string;
  start_date?: string;
  due_date?: string;
}

export interface IssueUpdate {
  title?: string;
  description?: string;
  priority?: IssuePriority;
  estimate?: string;
  parent_issue_id?: string;
  assignee_id?: string;
  position?: number;
  version: number;
  start_date?: string;
  due_date?: string;
}

export interface IssueTransitionRequest {
  target_status: IssueStatus;
  current_version: number;
}
