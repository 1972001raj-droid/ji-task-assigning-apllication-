import { Issue, IssueStatus } from './issue';

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SprintCreate {
  project_id: string;
  name: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
}

export interface BoardColumn {
  status: IssueStatus;
  title: string;
  issues: Issue[];
}

export interface BoardResponse {
  project_id: string;
  sprint_id?: string | null;
  columns: BoardColumn[];
}
