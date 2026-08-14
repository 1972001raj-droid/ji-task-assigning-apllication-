import { useState } from 'react';
import { Zap, Calendar, Plus } from 'lucide-react';
import { useStore } from '../store';
import { toast } from 'sonner';

export function SprintsPage() {
  const { sprints, issues, createSprint } = useStore();
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createSprint({ name, goal });
    toast.success('Sprint created');
    setName('');
    setGoal('');
    setNewOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sprints</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage release cycles and sprint goals.</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create sprint
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sprints.map((sprint) => {
          const sprintIssues = issues.filter((i) => i.sprintId === sprint.id);
          const done = sprintIssues.filter((i) => i.status === 'done').length;
          const progress = sprintIssues.length ? Math.round((done / sprintIssues.length) * 100) : 0;

          return (
            <div key={sprint.id} className="card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="pill bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 text-xs font-bold uppercase">
                    {sprint.status}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mt-2">{sprint.name}</h3>
                </div>
                <Zap className="w-5 h-5 text-indigo-500" />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{sprint.goal || 'No goal set.'}</p>

              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {sprint.startDate} → {sprint.endDate}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-400">
                  <span>{done}/{sprintIssues.length} issues done</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
