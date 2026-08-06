import React from 'react';
import { IssueStatus, IssuePriority, IssueType } from '../../types/issue';
import { SystemRole } from '../../types/auth';
import { AlertCircle, ArrowUp, ArrowDown, CheckCircle2, Bookmark, Bug, CheckSquare, Layers, ListTodo } from 'lucide-react';

interface BadgeProps {
  type?: 'status' | 'priority' | 'issueType' | 'role';
  value: string;
}

export const Badge: React.FC<BadgeProps> = ({ type = 'status', value }) => {
  const val = value.toUpperCase();

  if (type === 'priority') {
    let icon = <ArrowDown size={11} />;
    let className = 'badge-medium';

    if (val === 'CRITICAL' || val === 'URGENT') {
      icon = <AlertCircle size={11} />;
      className = 'badge-critical';
    } else if (val === 'HIGH') {
      icon = <ArrowUp size={11} />;
      className = 'badge-high';
    } else if (val === 'LOW') {
      icon = <ArrowDown size={11} />;
      className = 'badge-low';
    }

    return (
      <span className={`badge ${className}`}>
        {icon} {val}
      </span>
    );
  }

  if (type === 'issueType') {
    let icon = <CheckSquare size={11} />;
    let className = 'badge-task';

    if (val === 'EPIC') {
      icon = <Layers size={11} />;
      className = 'badge-epic';
    } else if (val === 'STORY') {
      icon = <Bookmark size={11} />;
      className = 'badge-story';
    } else if (val === 'BUG') {
      icon = <Bug size={11} />;
      className = 'badge-bug';
    } else if (val === 'SUBTASK') {
      icon = <ListTodo size={11} />;
      className = 'badge-subtask';
    }

    return (
      <span className={`badge ${className}`}>
        {icon} {val}
      </span>
    );
  }

  if (type === 'status') {
    let className = 'badge-backlog';
    if (val === 'TODO') className = 'badge-todo';
    if (val === 'IN_PROGRESS') className = 'badge-in_progress';
    if (val === 'IN_REVIEW' || val === 'REVIEW') className = 'badge-in_review';
    if (val === 'DONE') className = 'badge-done';

    return (
      <span className={`badge ${className}`}>
        {val === 'DONE' && <CheckCircle2 size={11} />}
        {val.replace(/_/g, ' ')}
      </span>
    );
  }

  if (type === 'role') {
    let className = 'badge-task';
    if (val === 'ADMIN') className = 'badge-high';
    if (val === 'MANAGER') className = 'badge-story';

    return <span className={`badge ${className}`}>{val}</span>;
  }

  return <span className="badge badge-backlog">{value}</span>;
};
