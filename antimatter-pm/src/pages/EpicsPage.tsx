import { useState } from 'react';
import { Layers, Plus, LayoutGrid, List, Search, ArrowUpRight } from 'lucide-react';
import { useStore } from '../store';
import type { Issue } from '../types';
import { UserAvatar } from '../components/common/UserAvatar';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { cn, isUuidOrHash } from '../lib/utils';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import { CreateIssueDialog } from '../components/common/CreateIssueDialog';

export function EpicsPage() {
  const { epics, issues, users, currentProject } = useStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEpic, setSelectedEpic] = useState<Issue | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createStoryDefaults, setCreateStoryDefaults] = useState<any>(null);

  // Filter epics
  const filteredEpics = epics.filter((epic) => {
    if (search && !epic.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && epic.status !== statusFilter) return false;
    return true;
  });

  const handleOpenEpicDrawer = (epicId: string) => {
    const epicIssue = issues.find(i => i.id === epicId) || {
      id: epicId,
      key: epics.find(e => e.id === epicId)?.key || 'EPIC',
      type: 'epic' as const,
      title: epics.find(e => e.id === epicId)?.title || 'Epic',
      description: epics.find(e => e.id === epicId)?.description || '',
      status: 'in-progress' as const,
      priority: 'high' as const,
      reporterId: users[0]?.id || '',
      labels: [],
      commentCount: 0,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    setSelectedEpic(epicIssue);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-500" />
            <span>Epics & Initiatives</span>
            {currentProject && (
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {currentProject.key}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            High-level features, feature roadmaps, and story progress.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* View Toggle */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-200')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-200')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setCreateStoryDefaults({ type: 'epic' });
              setCreateDialogOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Epic</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search epics by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input text-xs w-auto">
          <option value="all">All Statuses</option>
          <option value="in-progress">In Progress</option>
          <option value="todo">To Do</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Epics View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEpics.map((epic) => {
            const owner = users.find((u) => u.id === epic.ownerId);
            const linkedStories = issues.filter((i) => i.type === 'story' && (i.epicId === epic.id || i.parentId === epic.id));
            const doneStories = linkedStories.filter((s) => s.status === 'done').length;
            const progressPercent = linkedStories.length > 0 ? Math.round((doneStories / linkedStories.length) * 100) : 0;
            const totalPoints = linkedStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

            return (
              <div
                key={epic.id}
                onClick={() => handleOpenEpicDrawer(epic.id)}
                className="card p-6 space-y-4 cursor-pointer hover:border-purple-500/50 hover:shadow-xl transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {!isUuidOrHash(epic.key) && (
                        <span className="font-mono text-xs font-bold text-purple-400">{epic.key}</span>
                      )}
                      <PriorityBadge priority={epic.priority} size="sm" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-purple-400 transition-colors leading-snug">
                      {epic.title}
                    </h3>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors shrink-0" />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {epic.description || 'No description provided.'}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span>{doneStories} of {linkedStories.length} User Stories done</span>
                    <span className="font-mono font-bold text-purple-400">{progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="font-mono font-semibold text-slate-400">{totalPoints} story pts</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateStoryDefaults({ type: 'story', epicId: epic.id });
                        setCreateDialogOpen(true);
                      }}
                      className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-semibold text-[11px] transition-colors"
                    >
                      + User Story
                    </button>
                    {owner && <UserAvatar user={owner} size="xs" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredEpics.map((epic) => {
            const owner = users.find((u) => u.id === epic.ownerId);
            const linkedStories = issues.filter((i) => i.type === 'story' && (i.epicId === epic.id || i.parentId === epic.id));
            const doneStories = linkedStories.filter((s) => s.status === 'done').length;
            const progressPercent = linkedStories.length > 0 ? Math.round((doneStories / linkedStories.length) * 100) : 0;

            return (
              <div
                key={epic.id}
                onClick={() => handleOpenEpicDrawer(epic.id)}
                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                  {!isUuidOrHash(epic.key) && (
                    <span className="font-mono font-bold text-purple-400 shrink-0">{epic.key}</span>
                  )}
                  <span className="font-semibold text-slate-900 dark:text-white truncate">{epic.title}</span>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <span className="text-slate-400">{doneStories}/{linkedStories.length} stories ({progressPercent}%)</span>
                  <PriorityBadge priority={epic.priority} size="sm" />
                  {owner && <UserAvatar user={owner} size="xs" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Epic Detail Drawer */}
      <IssueDrawer
        issue={selectedEpic}
        onClose={() => setSelectedEpic(null)}
        onSelectIssue={(iss) => setSelectedEpic(iss)}
      />

      {/* Create Issue Dialog */}
      {createDialogOpen && (
        <CreateIssueDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          defaults={createStoryDefaults}
        />
      )}
    </div>
  );
}
