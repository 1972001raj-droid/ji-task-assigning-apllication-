import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import { useStore } from '../store';
import { UserAvatar } from '../components/common/UserAvatar';
import { toast } from 'sonner';

export function Reports() {
  const { issues, sprints, users, activeSprintId, setActiveSprintId } = useStore();

  const sprintIssues = issues.filter((i) => i.sprintId === activeSprintId);
  const totalSprintPts = sprintIssues.reduce((sum, i) => sum + (i.storyPoints ?? 1), 0);
  const completedSprintPts = sprintIssues.filter(i => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints ?? 1), 0);
  const remainingSprintPts = totalSprintPts - completedSprintPts;

  // Dynamic Burndown Chart points calculated from active sprint state
  const burndownData = [
    { day: 'Start', actual: totalSprintPts, ideal: totalSprintPts },
    { day: 'Day 3', actual: Math.max(remainingSprintPts, Math.round(totalSprintPts * 0.7)), ideal: Math.round(totalSprintPts * 0.75) },
    { day: 'Day 7', actual: Math.max(remainingSprintPts, Math.round(totalSprintPts * 0.4)), ideal: Math.round(totalSprintPts * 0.5) },
    { day: 'Day 10', actual: Math.max(remainingSprintPts, Math.round(totalSprintPts * 0.2)), ideal: Math.round(totalSprintPts * 0.25) },
    { day: 'Target', actual: remainingSprintPts, ideal: 0 },
  ];

  // Story points breakdown by status
  const statusStoryPoints = {
    backlog: sprintIssues.filter((i) => i.status === 'backlog').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    todo: sprintIssues.filter((i) => i.status === 'todo').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    'in-progress': sprintIssues.filter((i) => i.status === 'in-progress').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    'in-review': sprintIssues.filter((i) => i.status === 'in-review').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    done: sprintIssues.filter((i) => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
  };

  // Priority breakdown
  const priorityCounts = {
    urgent: issues.filter((i) => i.priority === 'urgent').length,
    high: issues.filter((i) => i.priority === 'high').length,
    medium: issues.filter((i) => i.priority === 'medium').length,
    low: issues.filter((i) => i.priority === 'low').length,
  };
  const maxPriority = Math.max(...Object.values(priorityCounts), 1);

  // Export CSV
  const exportCSV = () => {
    const headers = ['ID', 'Key', 'Title', 'Type', 'Status', 'Priority', 'Story Points'];
    const rows = issues.map((i) => [
      i.id, i.key, `"${i.title.replace(/"/g, '""')}"`, i.type, i.status, i.priority, i.storyPoints ?? 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `antimatter-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report downloaded successfully');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Sprint health, velocity, and team analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeSprintId}
            onChange={(e) => setActiveSprintId(e.target.value)}
            className="input w-auto text-xs cursor-pointer"
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button onClick={exportCSV} className="btn-secondary whitespace-nowrap">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Row 1: Burndown + Status distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sprint Burndown */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Sprint burndown</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ideal vs actual remaining work</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burndownData}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2.5} fill="url(#actualGrad)" name="Actual Pts" />
                <Area type="monotone" dataKey="ideal" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="4 4" fill="none" name="Ideal Pts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Status distribution</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Story points by column</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 text-center">
            {Object.entries(statusStoryPoints).map(([status, pts]) => (
              <div key={status} className={`space-y-2 ${status === 'done' ? 'col-span-2 sm:col-span-1' : ''}`}>
                <div className="h-2 rounded-full bg-indigo-500/80" />
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap">
                  {status.replace('-', ' ')}
                </span>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{pts} pts</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Priority breakdown + Team throughput */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Priority breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Urgent', count: priorityCounts.urgent, color: 'bg-rose-500' },
              { label: 'High', count: priorityCounts.high, color: 'bg-orange-500' },
              { label: 'Medium', count: priorityCounts.medium, color: 'bg-amber-500' },
              { label: 'Low', count: priorityCounts.low, color: 'bg-slate-400' },
            ].map(({ label, count, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  <span className="text-slate-400 font-bold">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${(count / maxPriority) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Throughput */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Team throughput</h2>
          <div className="space-y-4">
            {users.slice(0, 4).map((u) => {
              const userIssues = issues.filter((i) => i.assigneeId === u.id);
              const donePts = userIssues.filter((i) => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
              const totalPts = userIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

              return (
                <div key={u.id} className="flex items-center gap-3">
                  <UserAvatar user={u} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</span>
                      <span className="text-slate-400 font-mono">{donePts}/{totalPts} pts</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${totalPts ? (donePts / totalPts) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
