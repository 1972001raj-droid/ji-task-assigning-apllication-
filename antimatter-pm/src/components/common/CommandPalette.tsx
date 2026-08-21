import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, ListTodo, KanbanSquare, Layers, BarChart3, Users, X } from 'lucide-react';
import { useStore } from '../../store';
import { IssueTypeIcon } from './IssueTypeIcon';
import { isUuidOrHash } from '../../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

const QUICK_LINKS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Backlog', icon: ListTodo, to: '/backlog' },
  { label: 'Sprint Board', icon: KanbanSquare, to: '/board' },
  { label: 'Epics', icon: Layers, to: '/epics' },
  { label: 'Reports', icon: BarChart3, to: '/reports' },
  { label: 'Team', icon: Users, to: '/team' },
];

export function CommandPalette({ open, onClose }: Props) {
  const { issues, epics, users } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  if (!open) return null;

  const q = query.toLowerCase();
  const matchedIssues = q.length > 1
    ? issues.filter(i => i.title.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)).slice(0, 6)
    : [];
  const matchedEpics = q.length > 1
    ? epics.filter(e => e.title.toLowerCase().includes(q) || e.key.toLowerCase().includes(q)).slice(0, 3)
    : [];
  const matchedUsers = q.length > 1
    ? users.filter(u => u.name.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const goTo = (path: string) => { navigate(path); onClose(); setQuery(''); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-none sm:backdrop-blur-sm md:backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative card w-full max-w-2xl overflow-hidden z-10"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search issues, epics, people..."
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[480px] overflow-y-auto p-2">
          {/* Quick links when no query */}
          {!q && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Quick navigation</p>
              {QUICK_LINKS.map(({ label, icon: Icon, to }) => (
                <button key={to} onClick={() => goTo(to)} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 transition-colors">
                  <Icon className="w-4 h-4 text-slate-400" />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Issues */}
          {matchedIssues.length > 0 && (
            <div className="mt-2">
              <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Issues</p>
              {matchedIssues.map(issue => (
                <button key={issue.id} onClick={() => onClose()} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-left transition-colors">
                  <IssueTypeIcon type={issue.type} size="sm" />
                  {!isUuidOrHash(issue.key) && (
                    <span className="text-slate-400 text-xs font-mono">{issue.key}</span>
                  )}
                  <span className="text-slate-700 dark:text-slate-300 flex-1 truncate">{issue.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Epics */}
          {matchedEpics.length > 0 && (
            <div className="mt-2">
              <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Epics</p>
              {matchedEpics.map(epic => (
                <button key={epic.id} onClick={() => goTo('/epics')} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-left transition-colors">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  {!isUuidOrHash(epic.key) && (
                    <span className="text-slate-400 text-xs font-mono">{epic.key}</span>
                  )}
                  <span className="text-slate-700 dark:text-slate-300 flex-1 truncate">{epic.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* People */}
          {matchedUsers.length > 0 && (
            <div className="mt-2">
              <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">People</p>
              {matchedUsers.map(user => (
                <button key={user.id} onClick={() => goTo('/team')} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-left transition-colors">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: user.avatarColor }}>
                    {user.initials}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">{user.name}</span>
                  <span className="text-slate-400 text-xs">{user.role}</span>
                </button>
              ))}
            </div>
          )}

          {q.length > 1 && matchedIssues.length === 0 && matchedEpics.length === 0 && matchedUsers.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No results for "{query}"</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
