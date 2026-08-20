import { useState, useMemo } from 'react';
import { Bug, Plus, Search, LayoutGrid, List, BookOpen, Layers } from 'lucide-react';
import { useStore } from '../store';
import { IssueCard } from '../components/kanban/IssueCard';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import { CreateIssueDialog } from '../components/common/CreateIssueDialog';
import { IssueTypeIcon } from '../components/common/IssueTypeIcon';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { cn, isUuidOrHash, statusLabel, statusDotColor, formatDate } from '../lib/utils';
import type { Issue } from '../types';

export function BugsPage() {
  const { issues, epics, users, currentProject } = useStore();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const bugs = useMemo(() => {
    return issues.filter((i) => i.type === 'bug');
  }, [issues]);

  const filtered = useMemo(() => {
    return bugs.filter((bug) => {
      if (query && !bug.title.toLowerCase().includes(query.toLowerCase()) && !bug.key.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && bug.priority !== priorityFilter) return false;
      return true;
    });
  }, [bugs, query, statusFilter, priorityFilter]);

  const openCount = useMemo(() => bugs.filter((b) => b.status !== 'done').length, [bugs]);
  const urgentCount = useMemo(() => bugs.filter((b) => b.priority === 'urgent' && b.status !== 'done').length, [bugs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bug className="w-6 h-6 text-rose-500" />
            <span>Bug Reports</span>
            {currentProject && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 font-mono font-bold border border-rose-500/20">
                {currentProject.key}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} bug report{filtered.length === 1 ? '' : 's'} ({openCount} open{urgentCount > 0 ? `, ${urgentCount} urgent` : ''}).
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-rose-500 dark:text-rose-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-rose-500 dark:text-rose-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setCreateDialogOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/25 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Report Bug</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search bugs by title or key..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input text-xs w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="in-review">In Review</option>
          <option value="done">Resolved (Done)</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="input text-xs w-auto"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Content View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((bug) => (
            <IssueCard key={bug.id} issue={bug} onClick={() => setSelectedIssue(bug)} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <th className="py-3 px-4 w-28">Key</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4 w-44">Parent Story / Epic</th>
                  <th className="py-3 px-4 w-24">Severity</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-28">Due Date</th>
                  <th className="py-3 px-4 w-24">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((bug) => {
                  const parentStory = issues.find((i) => i.id === bug.parentId);
                  const parentEpicId = bug.epicId || (parentStory ? parentStory.epicId || parentStory.parentId : undefined);
                  const parentEpic = epics.find((e) => e.id === parentEpicId);
                  const assignee = users.find((u) => u.id === bug.assigneeId);

                  return (
                    <tr
                      key={bug.id}
                      onClick={() => setSelectedIssue(bug)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <IssueTypeIcon type={bug.type} />
                          {!isUuidOrHash(bug.key) && (
                            <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
                              {bug.key}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-rose-500 transition-colors">
                          {bug.title}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 min-w-0 max-w-[170px]">
                          {parentStory && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 dark:text-emerald-400 font-medium truncate">
                              <BookOpen className="w-3 h-3 shrink-0" />
                              <span className="truncate">{parentStory.title}</span>
                            </span>
                          )}
                          {parentEpic && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate"
                              style={{
                                backgroundColor: (parentEpic.color || '#8b5cf6') + '15',
                                color: parentEpic.color || '#8b5cf6',
                              }}
                            >
                              <Layers className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{parentEpic.title}</span>
                            </span>
                          )}
                          {!parentStory && !parentEpic && <span className="text-slate-400 text-[11px]">—</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <PriorityBadge priority={bug.priority} />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full', statusDotColor(bug.status))} />
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                            {statusLabel(bug.status)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {bug.dueDate ? (
                          <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                            {formatDate(bug.dueDate)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <UserAvatar user={assignee} size="xs" />
                            <span className="truncate max-w-[80px] text-slate-600 dark:text-slate-300">{assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center space-y-3">
          <Bug className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No bug reports found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {query || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'No bugs have been logged. Click below to report a new bug issue.'}
            </p>
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="btn-primary text-xs gap-1.5 mt-2 bg-rose-600 hover:bg-rose-500"
          >
            <Plus className="w-3.5 h-3.5" /> Report Bug
          </button>
        </div>
      )}

      <IssueDrawer issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      <CreateIssueDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        defaults={{ type: 'bug' }}
      />
    </div>
  );
}
