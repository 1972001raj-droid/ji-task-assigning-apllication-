import type { User } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizes = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

export function UserAvatar({ user, size = 'md', className, showTooltip }: Props) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0 cursor-default select-none ring-2 ring-white dark:ring-slate-800',
        sizes[size],
        className
      )}
      style={{ backgroundColor: user.avatarColor }}
      title={showTooltip !== false ? user.name : undefined}
    >
      {user.initials}
    </div>
  );
}
