import { motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useStore } from '../../store';
import { formatRelativeDate } from '../../lib/utils';

export function NotificationPanel() {
  const { notifications, markAllNotificationsRead } = useStore();
  const sorted = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-11 w-80 card overflow-hidden z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notifications
        </span>
        <button onClick={markAllNotificationsRead} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          <CheckCheck className="w-3 h-3" /> Mark all read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No notifications</div>
        ) : sorted.map(n => (
          <div
            key={n.id}
            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 items-start"
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-transparent' : 'bg-indigo-500'}`} />
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{n.message}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatRelativeDate(n.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
