import { useState } from 'react';
import { Calendar, Plus, Clock, Pencil } from 'lucide-react';
import { useStore } from '../store';
import { formatDate } from '../lib/utils';
import type { Sprint } from '../types';

export function SprintsPage() {
  const { sprints, issues, createSprint, updateSprint, users, currentUserId } = useStore();
  const currentUser = users.find(u => u.id === currentUserId);

  const isAdmin = currentUser?.isSuperuser || currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.roles?.some(r => r.toUpperCase().includes('ADMIN'));
  const isManager = currentUser?.role?.toUpperCase().includes('MANAGER') || currentUser?.roles?.some(r => r.toUpperCase().includes('MANAGER'));
  const canManage = isAdmin || isManager;

  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStatus, setEditStatus] = useState<any>('active');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createSprint({
      name,
      goal,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined
    });
    setName('');
    setGoal('');
    setStartDate('');
    setEndDate('');
    setNewOpen(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSprint || !editName.trim()) return;
    await updateSprint(editingSprint.id, {
      name: editName,
      goal: editGoal,
      status: editStatus,
      startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
      endDate: editEndDate ? new Date(editEndDate).toISOString() : undefined
    });
    setEditingSprint(null);
  };

  const getDayCounterBadge = (sprint: Sprint) => {
    const text = sprint.dayCounterText || sprint.status.toUpperCase();
    const isOverdue = sprint.isOverdue || sprint.status === 'overdue';
    const isDueToday = text.toLowerCase().includes('due today');
    const isCompleted = sprint.status === 'completed';

    let colorClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (isOverdue) {
      colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold animate-pulse';
    } else if (isDueToday) {
      colorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold';
    } else if (isCompleted) {
      colorClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    } else if (sprint.status === 'planned') {
      colorClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${colorClass}`}>
        <Clock className="w-3 h-3" />
        {text}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sprints</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage release cycles, sprint goals, and active timelines.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] sm:text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all whitespace-nowrap min-w-max"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span>Create sprint</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sprints.map((sprint) => {
          const sprintIssues = issues.filter((i) => i.sprintId === sprint.id);
          const done = sprintIssues.filter((i) => i.status === 'done').length;
          const progress = sprintIssues.length ? Math.round((done / sprintIssues.length) * 100) : 0;

          return (
            <div key={sprint.id} className="card p-5 space-y-4 relative group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="pill bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 text-xs font-bold uppercase">
                      {sprint.status}
                    </span>
                    {getDayCounterBadge(sprint)}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mt-2.5">{sprint.name}</h3>
                </div>
                {canManage && (
                  <button
                    onClick={() => {
                      setEditingSprint(sprint);
                      setEditName(sprint.name);
                      setEditGoal(sprint.goal || '');
                      setEditStatus(sprint.status);
                      setEditStartDate(sprint.startDate ? sprint.startDate.split('T')[0] : '');
                      setEditEndDate(sprint.endDate ? sprint.endDate.split('T')[0] : '');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Edit sprint"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{sprint.goal || 'No goal set.'}</p>

              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-400">
                  <span>{done}/{sprintIssues.length} issues done</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Sprint</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="e.g. Sprint 26 — Apex" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint Goal</label>
                <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} className="input resize-none" placeholder="What is the objective?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Sprint: {editingSprint.name}</h2>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint Goal</label>
                <textarea value={editGoal} onChange={(e) => setEditGoal(e.target.value)} rows={3} className="input resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} className="input capitalize">
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                  <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                  <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingSprint(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
