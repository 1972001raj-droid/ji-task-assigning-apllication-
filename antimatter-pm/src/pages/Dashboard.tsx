import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, Layers, TrendingUp, ListTodo,
  ArrowRight, Clock,
} from 'lucide-react';
import { useStore } from '../store';
import { MetricCard } from '../components/common/MetricCard';
import { UserAvatar } from '../components/common/UserAvatar';
import { statusLabel, formatRelativeDate } from '../lib/utils';
import type { Status } from '../types';

import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { CreateProjectDialog } from '../components/common/CreateProjectDialog';

const COLUMNS: Status[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];

const colColors: Record<Status, string> = {
  backlog: 'bg-slate-300 dark:bg-slate-600',
  todo: 'bg-blue-400',
  'in-progress': 'bg-indigo-500',
  'in-review': 'bg-amber-400',
  done: 'bg-emerald-500',
};

export function Dashboard() {
  const { users, issues, epics, sprints, activity, currentUserId, activeSprintId, projects } = useStore();
  const navigate = useNavigate();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const currentUser = users.find(u => u.id === currentUserId);
  const isAdmin = currentUser?.isSuperuser || currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.roles?.some(r => r.toUpperCase().includes('ADMIN'));
  const isManager = currentUser?.role?.toUpperCase().includes('MANAGER') || currentUser?.roles?.some(r => r.toUpperCase().includes('MANAGER'));
  const canCreateProject = isAdmin || isManager;

  const activeSprint = sprints.find(s => s.id === activeSprintId);
  const sprintIssues = issues.filter(i => i.sprintId === activeSprintId);
  const doneInSprint = sprintIssues.filter(i => i.status === 'done').length;
  const progress = sprintIssues.length ? Math.round((doneInSprint / sprintIssues.length) * 100) : 0;
  const totalIssues = issues.length;
  const completedIssues = issues.filter(i => i.status === 'done').length;
  const blockedIssues = issues.filter(i => i.priority === 'urgent').length;
  const activeEpics = epics.filter(e => e.status === 'in-progress').length;
  const velocity = sprintIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

  // Team workload
  const workloadData = users.map(u => ({
    user: u,
    open: issues.filter(i => i.assigneeId === u.id && i.status !== 'done').length,
  })).sort((a, b) => b.open - a.open);

  const maxOpen = Math.max(...workloadData.map(w => w.open), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Empty project banner for Manager */}
      {projects.length === 0 && canCreateProject && (
        <div className="p-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Projects Active in Workspace</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              As a Manager, create a project to start managing tasks, epics, sprints, and team assignments.
            </p>
          </div>
          <button
            onClick={() => setCreateProjectOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/25"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {currentUser?.name ? currentUser.name.split(' ')[0] : 'User'} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening across your projects today.</p>
        </div>
        <button
          onClick={() => navigate('/board')}
          className="btn-secondary gap-2 flex items-center text-xs py-2 px-3.5 shrink-0 whitespace-nowrap"
        >
          <span>Open Sprint Board</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

      <CreateProjectDialog open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} />


      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total tasks"
          value={totalIssues}
          icon={<ListTodo className="w-4 h-4 text-indigo-600" />}
          iconBg="bg-indigo-50 dark:bg-indigo-950/60"
        />
        <MetricCard
          label="Completed"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          value={completedIssues}
          iconBg="bg-emerald-50 dark:bg-emerald-950/60"
        />
        <MetricCard
          label="Blocked / urgent"
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          value={blockedIssues}
          iconBg="bg-rose-50 dark:bg-rose-950/60"
        />
        <MetricCard
          label="Active epics"
          icon={<Layers className="w-4 h-4 text-violet-600" />}
          value={activeEpics}
          iconBg="bg-violet-50 dark:bg-violet-950/60"
        />
        <MetricCard
          label="Velocity (pts)"
          icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
          value={velocity}
          iconBg="bg-amber-50 dark:bg-amber-950/60"
        />
      </div>

      {/* Sprint + Team row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sprint widget */}
        <div className="lg:col-span-2 card p-6 space-y-4">
          {activeSprint ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">{activeSprint.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{activeSprint.goal}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="pill bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    {sprintIssues.length} issues
                  </span>
                  {activeSprint.dayCounterText && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      activeSprint.isOverdue
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : activeSprint.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                    }`}>
                      {activeSprint.dayCounterText}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Progress</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  />
                </div>
              </div>

              {/* Status distribution */}
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Status distribution</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {COLUMNS.map(col => {
                    const count = sprintIssues.filter(i => i.status === col).length;
                    return (
                      <div key={col} className="text-center">
                        <div className={`h-1.5 rounded-full mb-2 ${colColors[col]}`} />
                        <p className="text-xs text-slate-500 dark:text-slate-400">{statusLabel(col).toLowerCase()}</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400">No active sprint</div>
          )}
        </div>

        {/* Team workload */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Team workload</h2>
          <div className="space-y-3">
            {workloadData.map(({ user, open }) => (
              <div key={user.id} className="flex items-center gap-3">
                <UserAvatar user={user} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{user.name}</p>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{open} open</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(open / maxOpen) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Recent activity</h2>
        <div className="space-y-3">
          {activity.slice(0, 8).map(event => {
            const user = users.find(u => u.id === event.userId);
            return (
              <div key={event.id} className="flex items-start gap-3">
                {user && <UserAvatar user={user} size="xs" className="mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{event.message}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeDate(event.createdAt)}
                </span>
              </div>
            );
          })}
          {activity.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
