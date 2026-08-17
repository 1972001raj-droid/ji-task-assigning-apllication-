import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Status, Priority, IssueType } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Explicit API-to-UI and UI-to-API enum mappers
export function mapBackendStatusToUI(status?: string): Status {
  if (!status) return 'backlog';
  const u = status.toUpperCase();
  if (u === 'IN_PROGRESS') return 'in-progress';
  if (u === 'REVIEW' || u === 'IN_REVIEW') return 'in-review';
  if (u === 'DONE') return 'done';
  if (u === 'TODO') return 'todo';
  return 'backlog';
}

export function mapUIStatusToBackend(status: Status): string {
  if (status === 'in-progress') return 'IN_PROGRESS';
  if (status === 'in-review') return 'REVIEW';
  if (status === 'done') return 'DONE';
  if (status === 'todo') return 'TODO';
  return 'BACKLOG';
}

export function mapBackendTypeToUI(type?: string): IssueType {
  if (!type) return 'task';
  const u = type.toUpperCase();
  if (u === 'EPIC') return 'epic';
  if (u === 'STORY') return 'story';
  if (u === 'TASK') return 'task';
  if (u === 'SUBTASK') return 'subtask';
  if (u === 'BUG') return 'bug';
  return 'task';
}

export function mapUITypeToBackend(type: IssueType): string {
  if (type === 'epic') return 'EPIC';
  if (type === 'story') return 'STORY';
  if (type === 'task') return 'TASK';
  if (type === 'subtask') return 'SUBTASK';
  if (type === 'bug') return 'BUG';
  return 'TASK';
}

export function mapBackendPriorityToUI(priority?: string): Priority {
  if (!priority) return 'medium';
  const u = priority.toLowerCase();
  if (u === 'urgent') return 'urgent';
  if (u === 'high') return 'high';
  if (u === 'low') return 'low';
  return 'medium';
}

export function statusLabel(status: Status): string {
  const map: Record<Status, string> = {
    backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress',
    'in-review': 'In Review', done: 'Done',
  };
  return map[status] ?? status;
}

export function priorityLabel(priority: Priority): string {
  const map: Record<Priority, string> = {
    urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
  };
  return map[priority] ?? priority;
}

export function issueTypeLabel(type: IssueType): string {
  const map: Record<IssueType, string> = {
    epic: 'Epic', story: 'User Story', task: 'Task', bug: 'Bug', subtask: 'Subtask',
  };
  return map[type] ?? type;
}

export function statusColor(status: Status): string {
  const map: Record<Status, string> = {
    backlog: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
    todo: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
    'in-progress': 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950',
    'in-review': 'text-amber-600 bg-amber-50 dark:bg-amber-950',
    done: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950',
  };
  return map[status] ?? '';
}

export function statusDotColor(status: Status): string {
  const map: Record<Status, string> = {
    backlog: 'bg-slate-400', todo: 'bg-blue-500', 'in-progress': 'bg-indigo-500',
    'in-review': 'bg-amber-500', done: 'bg-emerald-500',
  };
  return map[status] ?? 'bg-gray-400';
}

export function priorityColor(priority: Priority): string {
  const map: Record<Priority, string> = {
    urgent: 'text-rose-600', high: 'text-orange-500',
    medium: 'text-amber-500', low: 'text-slate-400',
  };
  return map[priority] ?? '';
}

export function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return 'recently';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'recently';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function epicColor(color?: string): { bg: string; text: string } {
  const c = color || '#6366f1';
  return { bg: `${c}1a`, text: c };
}

export function getUserRoleLabel(user?: { role?: string; roles?: string[]; isSuperuser?: boolean } | null): string {
  if (!user) return 'Member';
  if (user.isSuperuser) return 'Admin';
  const roleStr = (user.role || (user.roles && user.roles[0]) || '').toUpperCase();
  if (roleStr.includes('ADMIN')) return 'Admin';
  if (roleStr.includes('MANAGER')) return 'Manager';
  if (roleStr === 'DEVELOPER' || (user.roles?.includes('DEVELOPER') && !user.roles?.includes('TESTER'))) return 'Developer';
  if (roleStr === 'TESTER' || (user.roles?.includes('TESTER') && !user.roles?.includes('DEVELOPER'))) return 'Tester';
  return 'Developer / Tester';
}

export function isUuidOrHash(str?: string): boolean {
  if (!str) return false;
  const clean = str.trim();
  const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  const isHexId = /^[0-9a-f]{4,8}$/i.test(clean);
  return isFullUuid || isHexId;
}

export function getEpicDisplayName(epic?: { key?: string; title?: string } | null): string {
  if (!epic) return '';
  const key = epic.key && !isUuidOrHash(epic.key) ? epic.key : '';
  const title = epic.title && !isUuidOrHash(epic.title) ? epic.title : '';
  
  if (key && title) return `${key}: ${title}`;
  return key || title;
}

export function getShortDisplayName(item?: { key?: string; title?: string } | null): string {
  if (!item) return '';
  const key = item.key && !isUuidOrHash(item.key) ? item.key : '';
  const title = item.title && !isUuidOrHash(item.title) ? item.title : '';
  return key || title;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'No date';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}




