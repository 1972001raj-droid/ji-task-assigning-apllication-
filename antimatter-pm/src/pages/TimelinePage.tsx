import { Calendar } from 'lucide-react';
import { useStore } from '../store';
import { IssueTypeIcon } from '../components/common/IssueTypeIcon';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { isUuidOrHash } from '../lib/utils';

export function TimelinePage() {
  const { issues, users } = useStore();
  const sorted = [...issues].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-500" /> Timeline
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Chronological timeline of project milestones and tasks.</p>
      </div>

      <div className="card p-6 relative space-y-6 before:absolute before:left-8 before:top-8 before:bottom-8 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {sorted.map((issue) => {
          const assignee = users.find((u) => u.id === issue.assigneeId);

          return (
            <div key={issue.id} className="relative flex items-start gap-4 pl-10">
              <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />

              <div className="flex-1 card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type={issue.type} size="sm" />
                    {!isUuidOrHash(issue.key) && (
                      <span className="font-mono text-xs text-slate-400">{issue.key}</span>
                    )}
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{issue.title}</h3>
                  </div>
                  <PriorityBadge priority={issue.priority} size="sm" />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Due: {issue.dueDate || 'No due date'}</span>
                  {assignee && <UserAvatar user={assignee} size="xs" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
