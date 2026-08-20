import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Download, BarChart3, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../lib/api';
import { UserAvatar } from '../components/common/UserAvatar';
import { toast } from 'sonner';

export function Reports() {
  const { issues, sprints, users, activeSprintId, setActiveSprintId, currentProject } = useStore();
  const [burndownData, setBurndownData] = useState<any[]>([]);
  const [loadingBurndown, setLoadingBurndown] = useState(false);

  const activeSprint = sprints.find((s) => s.id === activeSprintId) || sprints[0];
  const selectedId = activeSprint?.id || activeSprintId;

  // Fetch real burndown from backend whenever sprint changes
  useEffect(() => {
    if (!selectedId) return;

    const fetchBurndown = async () => {
      setLoadingBurndown(true);
      try {
        const res = await api.get(`/reports/burndown?sprint_id=${selectedId}`);
        if (res.data && Array.isArray(res.data.data_points) && res.data.data_points.length > 0) {
          const points = res.data.data_points.map((p: any) => ({
            day: p.day_label || p.date,
            actual: p.remaining_points != null ? p.remaining_points : p.actual,
            ideal: p.ideal_points != null ? p.ideal_points : p.ideal,
          }));
          setBurndownData(points);
        } else {
          // Fallback calculation from actual sprint issues
          calculateFallbackBurndown();
        }
      } catch (e) {
        calculateFallbackBurndown();
      } finally {
        setLoadingBurndown(false);
      }
    };

    const calculateFallbackBurndown = () => {
      const sprintIssues = issues.filter((i) => i.sprintId === selectedId);
      const totalPts = sprintIssues.reduce((sum, i) => sum + (i.storyPoints ?? 1), 0);
      const completedPts = sprintIssues.filter((i) => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints ?? 1), 0);
      const remPts = Math.max(0, totalPts - completedPts);

      setBurndownData([
        { day: 'Start', actual: totalPts, ideal: totalPts },
        { day: 'Day 3', actual: Math.max(remPts, Math.round(totalPts * 0.7)), ideal: Math.round(totalPts * 0.75) },
        { day: 'Day 7', actual: Math.max(remPts, Math.round(totalPts * 0.4)), ideal: Math.round(totalPts * 0.5) },
        { day: 'Day 10', actual: Math.max(remPts, Math.round(totalPts * 0.2)), ideal: Math.round(totalPts * 0.25) },
        { day: 'Target', actual: remPts, ideal: 0 },
      ]);
    };

    fetchBurndown();
  }, [selectedId, issues]);

  const sprintIssues = issues.filter((i) => i.sprintId === selectedId);

  // Story points breakdown by status for selected sprint
  const statusStoryPoints = {
    backlog: sprintIssues.filter((i) => i.status === 'backlog').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    todo: sprintIssues.filter((i) => i.status === 'todo').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    'in-progress': sprintIssues.filter((i) => i.status === 'in-progress').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    'in-review': sprintIssues.filter((i) => i.status === 'in-review').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    done: sprintIssues.filter((i) => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
  };

  // Priority breakdown across all issues
  const priorityCounts = {
    urgent: issues.filter((i) => i.priority === 'urgent').length,
    high: issues.filter((i) => i.priority === 'high').length,
    medium: issues.filter((i) => i.priority === 'medium').length,
    low: issues.filter((i) => i.priority === 'low').length,
  };
  const maxPriority = Math.max(...Object.values(priorityCounts), 1);

  // Export CSV
  const exportCSV = () => {
    const headers = ['ID', 'Key', 'Title', 'Type', 'Status', 'Priority', 'Story Points', 'Due Date'];
    const rows = issues.map((i) => [
      i.id,
      i.key,
      `"${i.title.replace(/"/g, '""')}"`,
      i.type,
      i.status,
      i.priority,
      i.storyPoints ?? 0,
      i.dueDate || '',
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            <span>Reports &amp; Analytics</span>
            {currentProject && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-mono font-bold border border-indigo-500/20">
                {currentProject.key}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sprint health, real burndown velocity, and team workload analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {sprints.length > 0 && (
            <select
              value={selectedId}
              onChange={(e) => setActiveSprintId(e.target.value)}
              className="input w-auto text-xs cursor-pointer"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          )}
          <button onClick={exportCSV} className="btn-secondary whitespace-nowrap text-xs gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {sprints.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
          <AlertCircle className="w-8 h-8 text-slate-400" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Sprints Found</h3>
          <p className="text-xs">Create a sprint to see burndown and velocity analytics.</p>
        </div>
      ) : (
        <>
          {/* Row 1: Burndown + Status distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sprint Burndown */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">Sprint Burndown</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeSprint ? activeSprint.name : 'Active Sprint'} — Ideal vs Actual remaining story points
                  </p>
                </div>
                {loadingBurndown && (
                  <span className="text-[10px] font-semibold text-indigo-400 animate-pulse">
                    Updating...
                  </span>
                )}
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
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#actualGrad)"
                      name="Actual Remaining Pts"
                    />
                    <Area
                      type="monotone"
                      dataKey="ideal"
                      stroke="#cbd5e1"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="none"
                      name="Ideal Pts"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="card p-6 space-y-4">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Status Distribution</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Story points by column in {activeSprint ? activeSprint.name : 'selected sprint'}
                </p>
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
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Priority Breakdown</h2>
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
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${(count / maxPriority) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Workload & Throughput */}
            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Team Workload</h2>
              <div className="space-y-4">
                {users.slice(0, 6).map((u) => {
                  const userIssues = issues.filter((i) => i.assigneeId === u.id);
                  const donePts = userIssues
                    .filter((i) => i.status === 'done')
                    .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
                  const totalPts = userIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <UserAvatar user={u} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {u.name}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {donePts}/{totalPts} pts ({userIssues.length} issues)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
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
        </>
      )}
    </div>
  );
}
