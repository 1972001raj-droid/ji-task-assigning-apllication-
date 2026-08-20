import { useState, useMemo } from 'react';
import { BookOpen, Plus, Search, LayoutGrid, List, Layers, Zap } from 'lucide-react';
import { useStore } from '../store';
import { IssueCard } from '../components/kanban/IssueCard';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import { CreateIssueDialog } from '../components/common/CreateIssueDialog';
import { IssueTypeIcon } from '../components/common/IssueTypeIcon';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { cn, isUuidOrHash, statusLabel, statusDotColor } from '../lib/utils';
import type { Issue } from '../types';

export function UserStoriesPage() {
  const { issues, epics, sprints, users, currentProject } = useStore();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const stories = useMemo(() => issues.filter((i) => i.type === 'story'), [issues]);

  const filtered = useMemo(() => {
    return stories.filter((story) => {
      if (query && !story.title.toLowerCase().includes(query.toLowerCase()) && !story.key.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && story.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && story.priority !== priorityFilter) return false;
      return true;
    });
  }, [stories, query, statusFilter, priorityFilter]);

  const totalPoints = useMemo(() => {
    return filtered.reduce((acc, curr) => acc + (curr.storyPoints || 0), 0);
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-500" />
            <span>User Stories</span>
            {currentProject && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20">
                {currentProject.key}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} customer-facing narrative{filtered.length === 1 ? '' : 's'} ({totalPoints} story points).
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
                  ? 'bg-white dark:bg-slate-700 text-emerald-500 dark:text-emerald-400 shadow-sm'
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
                  ? 'bg-white dark:bg-slate-700 text-emerald-500 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setCreateDialogOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Story</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search user stories by title or key..."
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
          <option value="done">Done</option>
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
          {filtered.map((story) => (
            <IssueCard key={story.id} issue={story} onClick={() => setSelectedIssue(story)} />
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
                  <th className="py-3 px-4 w-36">Epic</th>
                  <th className="py-3 px-4 w-32">Sprint</th>
                  <th className="py-3 px-4 w-24">Priority</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-20 text-center">Points</th>
                  <th className="py-3 px-4 w-24">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((story) => {
                  const parentEpic = epics.find((e) => e.id === story.epicId);
                  const sprint = sprints.find((s) => s.id === story.sprintId);
                  const assignee = users.find((u) => u.id === story.assigneeId);

                  return (
                    <tr
                      key={story.id}
                      onClick={() => setSelectedIssue(story)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <IssueTypeIcon type={story.type} />
                          {!isUuidOrHash(story.key) && (
                            <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
                              {story.key}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">
                          {story.title}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {parentEpic ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold max-w-[130px] truncate"
                            style={{
                              backgroundColor: (parentEpic.color || '#8b5cf6') + '20',
                              color: parentEpic.color || '#8b5cf6',
                              border: `1px solid ${(parentEpic.color || '#8b5cf6')}40`,
                            }}
                          >
                            <Layers className="w-3 h-3 shrink-0" />
                            <span className="truncate">{parentEpic.title}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {sprint ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 font-medium truncate max-w-[120px]">
                            <Zap className="w-3 h-3 shrink-0" />
                            <span className="truncate">{sprint.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Backlog</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <PriorityBadge priority={story.priority} />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full', statusDotColor(story.status))} />
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                            {statusLabel(story.status)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {story.storyPoints != null ? (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
                            {story.storyPoints}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
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
          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No user stories found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {query || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'Create your first user story to break down epics into deliverable units.'}
            </p>
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="btn-primary text-xs gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Create User Story
          </button>
        </div>
      )}

      <IssueDrawer issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      <CreateIssueDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        defaults={{ type: 'story' }}
      />
    </div>
  );
}
