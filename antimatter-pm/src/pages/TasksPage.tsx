import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { useStore } from '../store';
import { IssueCard } from '../components/kanban/IssueCard';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import type { Issue } from '../types';

export function TasksPage() {
  const { issues } = useStore();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const tasks = issues.filter((i) => i.type === 'task' || i.type === 'bug');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-blue-500" /> Tasks & Bugs
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {tasks.length} tasks and bug reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <IssueCard key={task.id} issue={task} onClick={() => setSelectedIssue(task)} />
        ))}
      </div>

      <IssueDrawer issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </div>
  );
}
