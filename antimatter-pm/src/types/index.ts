export type IssueType = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type Status = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type EpicStatus = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done';

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  key: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  roles?: string[];
  isSuperuser?: boolean;
  avatarColor: string;
}


export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
  authorInitials?: string;
}

export interface AcceptanceCriterion {
  id: string;
  issueId: string;
  text: string;
  completed: boolean;
}

export interface Subtask {
  id: string;
  parentId: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
}

export interface ActivityEvent {
  id: string;
  issueId?: string;
  userId: string;
  type: 'created' | 'status_changed' | 'priority_changed' | 'assignee_changed' | 'comment_added' | 'moved' | 'sprint_changed' | 'points_changed';
  from?: string;
  to?: string;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  issueId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'planned' | 'completed';
}

export interface Epic {
  id: string;
  key: string;
  title: string;
  description: string;
  status: EpicStatus;
  priority: Priority;
  ownerId: string;
  color: string;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  key: string;
  type: IssueType;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId?: string;
  reporterId: string;
  sprintId?: string;
  epicId?: string;
  parentId?: string;
  storyPoints?: number;
  dueDate?: string;
  labels: string[];
  commentCount: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  effectiveEpicId?: string;
  isEligibleForReview?: boolean;
  isEligibleForDone?: boolean;
  acceptanceCriteria?: AcceptanceCriterion[];
  comments?: Comment[];
}

