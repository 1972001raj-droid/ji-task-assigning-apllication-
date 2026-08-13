import type { Status } from '../../types';
import { cn, statusLabel, statusDotColor } from '../../lib/utils';

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

const statusStyles: Record<Status, string> = {
  backlog: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80',
  todo: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
  'in-progress': 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
  'in-review': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
  done: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
};

export function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded-full',
      statusStyles[status],
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
    )}>
      <span className={cn('status-dot', statusDotColor(status))} />
      {statusLabel(status)}
    </span>
  );
}
