import { AlertTriangle, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import type { Priority } from '../../types';
import { cn, priorityLabel } from '../../lib/utils';

interface Props {
  priority: Priority;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const icons: Record<Priority, React.ComponentType<{ className?: string }>> = {
  urgent: AlertTriangle, high: ArrowUp, medium: ArrowRight, low: ArrowDown,
};

const colors: Record<Priority, string> = {
  urgent: 'text-rose-600', high: 'text-orange-500', medium: 'text-amber-500', low: 'text-slate-400',
};

export function PriorityBadge({ priority, showLabel = false, size = 'md' }: Props) {
  const Icon = icons[priority];
  return (
    <span className={cn('inline-flex items-center gap-1', colors[priority])} title={priorityLabel(priority)}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {showLabel && <span className="text-xs font-medium">{priorityLabel(priority)}</span>}
    </span>
  );
}
