import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  trend?: string;
  trendUp?: boolean;
}

export function MetricCard({ label, value, icon, iconBg, trend, trendUp }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="card p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-slate-900 dark:text-white leading-none">{value}</span>
        {trend && (
          <span className={cn('text-xs font-medium mb-0.5', trendUp ? 'text-emerald-600' : 'text-rose-500')}>
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}
