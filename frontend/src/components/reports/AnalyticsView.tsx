import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useProject } from '../../context/ProjectContext';
import { reportApi } from '../../api/reportApi';
import { sprintApi } from '../../api/sprintApi';
import { extractErrorMessage } from '../../api/client';
import { RoadmapItemResponse, TimelineItemResponse, BurndownResponse, TeamWorkloadResponse } from '../../types/report';
import { Sprint } from '../../types/sprint';
import { Badge } from '../common/Badge';
import { BarChart3, Download, Layers, Users, TrendingDown, AlertCircle, Clock, Calendar } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { activeProject } = useProject();

  const [roadmap, setRoadmap] = useState<RoadmapItemResponse[]>([]);
  const [timeline, setTimeline] = useState<TimelineItemResponse[]>([]);
  const [workload, setWorkload] = useState<TeamWorkloadResponse | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [burndown, setBurndown] = useState<BurndownResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const [rm, tm, wl, spList] = await Promise.all([
        reportApi.getRoadmap(activeProject.id),
        reportApi.getTimeline(activeProject.id),
        reportApi.getWorkload(activeProject.id),
        sprintApi.listSprints(activeProject.id),
      ]);

      setRoadmap(rm);
      setTimeline(tm);
      setWorkload(wl);
      setSprints(spList);

      if (spList.length > 0) {
        const firstId = spList[0].id;
        setSelectedSprintId(firstId);
        const bd = await reportApi.getBurndown(firstId);
        setBurndown(bd);
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeProject?.id]);

  const handleSprintBurndownChange = async (sprintId: string) => {
    setSelectedSprintId(sprintId);
    if (!sprintId) {
      setBurndown(null);
      return;
    }
    try {
      const bd = await reportApi.getBurndown(sprintId);
      setBurndown(bd);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
      setBurndown(null);
    }
  };

  const handleExportCsv = async () => {
    if (!activeProject) return;
    try {
      const blob = await reportApi.downloadIssuesCsv(activeProject.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `issues_export_${activeProject.key}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(`Failed to download CSV: ${extractErrorMessage(err)}`);
    }
  };

  if (!activeProject) {
    return (
      <div className="p-12 text-center text-[var(--text-muted)] glass-panel">
        Please select or create a project to view Analytics & Reports.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports & Analytics</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Roadmap progress, burndown velocity, and workload metrics for{' '}
            <span className="font-semibold text-[var(--accent-primary)]">{activeProject.name}</span> ({activeProject.key})
          </p>
        </div>

        <button onClick={handleExportCsv} className="btn-secondary text-xs py-2 px-4 shadow-sm">
          <Download size={16} />
          <span>Export Issues CSV</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sprint Burndown Chart Section */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingDown size={20} className="text-[var(--accent-primary)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Sprint Burndown Velocity</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Sprint:</span>
            <select
              value={selectedSprintId}
              onChange={(e) => handleSprintBurndownChange(e.target.value)}
              className="input-field text-xs py-1.5 w-48"
            >
              <option value="">Select Sprint...</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {burndown && burndown.data_points?.length > 0 ? (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndown.data_points}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="ideal_remaining_points"
                  name="Ideal Burndown"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="actual_remaining_points"
                  name="Actual Remaining"
                  stroke="#6366f1"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
            Select an active or planned sprint to visualize burndown velocity.
          </div>
        )}
      </div>

      {/* Grid: Epic Roadmap & Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Epic Roadmap */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-[var(--accent-orange)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Epic Progress Roadmap</h2>
          </div>

          {roadmap.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
              No epics created in this project yet.
            </div>
          ) : (
            <div className="space-y-4">
              {roadmap.map((rm) => (
                <div key={rm.epic_id} className="glass-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">{rm.epic_title}</span>
                    <span className="text-[var(--accent-primary)] font-bold">{rm.progress_percentage}%</span>
                  </div>

                  <div className="w-full bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-gradient)] transition-all duration-500"
                      style={{ width: `${Math.min(100, rm.progress_percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>
                      Stories Completed: {rm.completed_stories} / {rm.total_stories}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Workload Bar Chart */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[var(--accent-blue)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Team Workload Distribution</h2>
          </div>

          {workload && workload.members?.length > 0 ? (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workload.members}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="username" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="assigned_issues_count" name="Assigned Issues" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_estimated_points" name="Estimated Points" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
              No workload data recorded for team members.
            </div>
          )}
        </div>
      </div>

      {/* Project Timeline Stream */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-cyan-400" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">Project Issue Timeline</h2>
        </div>

        {timeline.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
            No timeline events recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {timeline.map((item) => (
              <div
                key={item.issue_id}
                className="p-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <Badge type="issueType" value={item.issue_type} />
                  <span className="font-semibold text-[var(--text-primary)]">{item.title}</span>
                  <Badge type="status" value={item.status} />
                </div>
                <div className="text-[var(--text-muted)] flex items-center gap-2">
                  <Clock size={12} />
                  <span>
                    {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'No start'} -{' '}
                    {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No due date'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
