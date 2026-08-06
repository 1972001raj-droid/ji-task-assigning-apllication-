import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { sprintApi } from '../../api/sprintApi';
import { searchApi } from '../../api/searchApi';
import { extractErrorMessage } from '../../api/client';
import { Sprint } from '../../types/sprint';
import { Issue, IssueStatus, IssueType } from '../../types/issue';
import { Badge } from '../common/Badge';
import { CreateSprintModal } from './CreateSprintModal';
import { IssueDetailModal } from '../kanban/IssueDetailModal';
import { Rocket, Plus, Layers, Calendar, AlertCircle, Info, Filter, Search } from 'lucide-react';

export const BacklogView: React.FC = () => {
  const { activeProject } = useProject();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchData = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const sprintList = await sprintApi.listSprints(activeProject.id);
      setSprints(sprintList);

      const searchRes = await searchApi.searchIssues({
        project_id: activeProject.id,
        q: searchQuery || undefined,
        issue_type: (typeFilter as IssueType) || undefined,
        status: (statusFilter as IssueStatus) || undefined,
        limit: 100,
      });
      setIssues(searchRes.items || []);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProject?.id, searchQuery, typeFilter, statusFilter]);

  const handleAssignToSprint = async (issueId: string, sprintId: string) => {
    if (!sprintId) return;
    try {
      await sprintApi.addIssueToSprint(sprintId, issueId);
      await fetchData();
    } catch (err: unknown) {
      setError(`Failed to assign to sprint: ${extractErrorMessage(err)}`);
    }
  };

  if (!activeProject) {
    return (
      <div className="p-12 text-center text-[var(--text-muted)] glass-panel">
        Please select or create a project to view the Backlog & Sprints.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Backlog & Sprints</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Manage agile iterations and backlog for{' '}
            <span className="font-semibold text-[var(--accent-primary)]">{activeProject.name}</span> ({activeProject.key})
          </p>
        </div>

        <button
          onClick={() => setIsCreateSprintOpen(true)}
          className="btn-primary text-xs py-2 px-4 shadow-sm"
        >
          <Rocket size={16} />
          <span>Create Sprint</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sprints Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Rocket size={18} className="text-[var(--accent-primary)]" />
            Project Sprints ({sprints.length})
          </h2>
        </div>

        {sprints.length === 0 ? (
          <div className="p-8 border border-dashed border-[var(--border-color)] rounded-xl text-center text-xs text-[var(--text-muted)] glass-panel">
            No sprints created yet. Click "Create Sprint" to launch your first iteration.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sprints.map((s) => (
              <div key={s.id} className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">{s.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'ACTIVE'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : s.status === 'COMPLETED'
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                {s.goal && <p className="text-xs text-[var(--text-muted)] line-clamp-2">{s.goal}</p>}

                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-color)] pt-2">
                  <Calendar size={12} />
                  <span>
                    {s.start_date ? new Date(s.start_date).toLocaleDateString() : 'TBD'} -{' '}
                    {s.end_date ? new Date(s.end_date).toLocaleDateString() : 'TBD'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disabled Sprint Edit Notice per backend constraints */}
        <div className="p-3 rounded-xl bg-[var(--accent-blue-light)] border border-blue-500/20 text-xs text-[var(--accent-blue)] flex items-start gap-2.5">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>Agile Workflow Note:</strong> The backend API supports sprint creation and issue assignment. Sprint state modifications or detail editing are strictly managed by system workflow rules.
          </span>
        </div>
      </div>

      {/* Backlog Issues Table & Search */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Layers size={18} className="text-[var(--accent-primary)]" />
            Issue Backlog ({issues.length})
          </h2>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search backlog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 py-1.5 text-xs w-48"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field py-1.5 text-xs w-32"
            >
              <option value="">All Types</option>
              <option value="EPIC">Epic</option>
              <option value="STORY">Story</option>
              <option value="TASK">Task</option>
              <option value="BUG">Bug</option>
              <option value="SUBTASK">Subtask</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field py-1.5 text-xs w-32"
            >
              <option value="">All Statuses</option>
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        </div>

        {/* Backlog List */}
        {issues.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
            No backlog issues match your search criteria.
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((iss) => (
              <div
                key={iss.id}
                onClick={() => {
                  setSelectedIssueId(iss.id);
                  setIsDetailOpen(true);
                }}
                className="p-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl flex items-center justify-between gap-4 hover:border-[var(--accent-primary)] cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Badge type="issueType" value={iss.issue_type} />
                  <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                    {iss.title}
                  </span>
                  <Badge type="status" value={iss.status} />
                  <Badge type="priority" value={iss.priority} />
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  {/* Sprint assignment dropdown */}
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleAssignToSprint(iss.id, e.target.value);
                    }}
                    className="input-field text-xs py-1 px-2 w-40"
                  >
                    <option value="" disabled>
                      Assign to Sprint...
                    </option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={isCreateSprintOpen}
        onClose={() => setIsCreateSprintOpen(false)}
        onSprintCreated={fetchData}
      />

      {/* Issue Detail Modal */}
      <IssueDetailModal
        issueId={selectedIssueId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onIssueUpdated={fetchData}
      />
    </div>
  );
};
