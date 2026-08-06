import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { searchApi } from '../../api/searchApi';
import { Issue, IssueStatus, IssuePriority, IssueType } from '../../types/issue';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Search, Filter } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIssue: (issue: Issue) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectIssue,
}) => {
  const { activeProject } = useProject();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | ''>('');
  const [typeFilter, setTypeFilter] = useState<IssueType | ''>('');

  const [results, setResults] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await searchApi.searchIssues({
        project_id: activeProject.id,
        q: query.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        issue_type: typeFilter || undefined,
        limit: 50,
      });
      setResults(res.items || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !activeProject) return;
    const timer = setTimeout(() => {
      performSearch();
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, query, statusFilter, priorityFilter, typeFilter, activeProject?.id]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global Issue Search" maxWidth="lg">
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            autoFocus
            placeholder="Search by title or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pl-10 text-xs py-2.5"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-xs">
          <span className="font-semibold text-[var(--text-muted)] flex items-center gap-1 uppercase">
            <Filter size={12} /> Filters:
          </span>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as IssueType | '')}
            className="input-field text-xs py-1 w-28"
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
            onChange={(e) => setStatusFilter(e.target.value as IssueStatus | '')}
            className="input-field text-xs py-1 w-28"
          >
            <option value="">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as IssuePriority | '')}
            className="input-field text-xs py-1 w-28"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)] animate-pulse">
              Searching issues...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)] italic">
              No issues found matching your query.
            </div>
          ) : (
            results.map((iss) => (
              <div
                key={iss.id}
                onClick={() => {
                  onSelectIssue(iss);
                  onClose();
                }}
                className="p-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl flex items-center justify-between gap-3 hover:border-[var(--accent-primary)] cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Badge type="issueType" value={iss.issue_type} />
                  <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                    {iss.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge type="status" value={iss.status} />
                  <Badge type="priority" value={iss.priority} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
