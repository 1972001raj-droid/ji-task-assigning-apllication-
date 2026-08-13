import { BookOpen, CheckSquare, Bug, Layers } from 'lucide-react';
import type { IssueType } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  type: IssueType;
  size?: 'sm' | 'md';
  className?: string;
}

export function IssueTypeIcon({ type, size = 'md', className }: Props) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const props = { className: cn(sizeClass, className) };

  switch (type) {
    case 'epic': return <Layers {...props} className={cn(sizeClass, 'text-purple-500', className)} />;
    case 'story': return <BookOpen {...props} className={cn(sizeClass, 'text-emerald-500', className)} />;
    case 'task': return <CheckSquare {...props} className={cn(sizeClass, 'text-blue-500', className)} />;
    case 'bug': return <Bug {...props} className={cn(sizeClass, 'text-rose-500', className)} />;
    case 'subtask': return <CheckSquare {...props} className={cn(sizeClass, 'text-slate-500', className)} />;
    default: return <CheckSquare {...props} />;
  }
}
