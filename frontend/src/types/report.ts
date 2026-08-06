import { IssueStatus, IssueType } from './issue';

export interface RoadmapItemResponse {
  epic_id: string;
  epic_title: string;
  total_stories: number;
  completed_stories: number;
  progress_percentage: number;
  start_date?: string | null;
  due_date?: string | null;
}

export interface TimelineItemResponse {
  issue_id: string;
  title: string;
  issue_type: IssueType;
  status: IssueStatus;
  start_date?: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
}

export interface BurndownPointResponse {
  date: string;
  ideal_remaining_points: number;
  actual_remaining_points: number;
}

export interface BurndownResponse {
  sprint_id: string;
  sprint_name: string;
  total_points: number;
  data_points: BurndownPointResponse[];
}

export interface MemberWorkloadResponse {
  user_id: string;
  username: string;
  assigned_issues_count: number;
  total_estimated_points: number;
}

export interface TeamWorkloadResponse {
  project_id: string;
  members: MemberWorkloadResponse[];
}
