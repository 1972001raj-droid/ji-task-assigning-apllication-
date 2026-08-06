import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Issue } from '../../types/issue';
import { Badge } from '../common/Badge';
import { User as UserIcon, GripVertical } from 'lucide-react';

interface IssueCardProps {
  issue: Issue;
  onClick: (issue: Issue) => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { issue, status: issue.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(issue)}
      className={`p-3.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-xs hover:shadow-md hover:border-[var(--accent-primary)] cursor-pointer transition-all group relative ${
        isDragging ? 'ring-2 ring-[var(--accent-primary)] z-50' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing p-0.5 rounded"
            aria-label="Drag issue handle"
          >
            <GripVertical size={14} />
          </button>
          <Badge type="issueType" value={issue.issue_type} />
        </div>
        <Badge type="priority" value={issue.priority} />
      </div>

      <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors line-clamp-2 mb-2">
        {issue.title}
      </h4>

      {issue.description && (
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">
          {issue.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          {issue.estimate && (
            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-primary)] font-bold text-[var(--text-secondary)]">
              {issue.estimate} pts
            </span>
          )}
          {issue.version > 1 && (
            <span className="text-[10px] text-[var(--text-muted)]">v{issue.version}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[var(--text-secondary)] font-medium">
          <UserIcon size={12} />
          <span>{issue.assignee_id ? 'Assigned' : 'Unassigned'}</span>
        </div>
      </div>
    </div>
  );
};
