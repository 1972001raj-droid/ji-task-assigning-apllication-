import { MessageSquare, Layers, BookOpen } from 'lucide-react';
import type { Issue } from '../../types';
import { useStore } from '../../store';
import { IssueTypeIcon } from '../common/IssueTypeIcon';
import { PriorityBadge } from '../common/PriorityBadge';
import { UserAvatar } from '../common/UserAvatar';
import { cn, isUuidOrHash, getShortDisplayName } from '../../lib/utils';

interface Props {
  issue: Issue;
  onClick?: () => void;
  isDragging?: boolean;
}

export function IssueCard({ issue, onClick, isDragging }: Props) {
  const { users, epics, issues } = useStore();

  const assignee = users.find((u) => u.id === issue.assigneeId);
  const parentEpic = (issue.type === 'epic')
    ? null
    : epics.find((e) => e.id === issue.epicId || e.id === issue.parentId) ||
      issues.find(i => i.id === issue.epicId && i.type === 'epic');
  const parentStory = (issue.type === 'task' || issue.type === 'bug' || issue.type === 'subtask') ? issues.find(i => i.id === issue.parentId && i.type === 'story') : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl p-3.5 space-y-2.5 cursor-pointer border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all select-none group',
        isDragging && 'opacity-70 shadow-2xl scale-105 border-indigo-500 bg-slate-900 ring-2 ring-indigo-500/40'
      )}
    >
      {/* Contextual Hierarchy Pill */}
      {((parentEpic && getShortDisplayName(parentEpic)) || (parentStory && getShortDisplayName(parentStory))) && (
        <div className="flex items-center gap-1.5 overflow-hidden">
          {parentEpic && getShortDisplayName(parentEpic) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 truncate max-w-[160px]">
              <Layers className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{getShortDisplayName(parentEpic)}</span>
            </span>
          )}
          {parentStory && getShortDisplayName(parentStory) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 truncate max-w-[160px]">
              <BookOpen className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{getShortDisplayName(parentStory)}</span>
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors">
        {issue.title}
      </h3>

      {/* Footer Meta */}
      <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <IssueTypeIcon type={issue.type} size="sm" />
          {!isUuidOrHash(issue.key) && (
            <span className="font-mono text-[10px] font-bold text-slate-400">{issue.key}</span>
          )}
          <PriorityBadge priority={issue.priority} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          {issue.commentCount > 0 && (
            <span className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold">
              <MessageSquare className="w-3 h-3" />
              {issue.commentCount}
            </span>
          )}
          {issue.storyPoints !== undefined && (
            <span className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-mono font-bold">
              {issue.storyPoints}
            </span>
          )}
          {assignee && <UserAvatar user={assignee} size="xs" />}
        </div>
      </div>
    </div>
  );
}
