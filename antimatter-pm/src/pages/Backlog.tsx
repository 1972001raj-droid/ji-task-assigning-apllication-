import { useState } from 'react';
import {
  Search, Plus, ChevronDown, ChevronRight,
  Trash2, CheckCircle2, ListTree, Check
} from 'lucide-react';
import { useStore } from '../store';
import type { Issue, Status } from '../types';
import { IssueTypeIcon } from '../components/common/IssueTypeIcon';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import { CreateIssueDialog } from '../components/common/CreateIssueDialog';
import { cn, isUuidOrHash, getShortDisplayName } from '../lib/utils';

export function Backlog() {
  const { issues, sprints, users, currentProject, moveIssue, deleteIssue } = useStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSprint, setFilterSprint] = useState<string>('all');

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [collapsedSprints, setCollapsedSprints] = useState<Record<string, boolean>>({});

  // Filter issues across active project with null-safe sprint matching
  const filtered = issues.filter((i) => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.key.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (filterPriority !== 'all' && i.priority !== filterPriority) return false;
    if (filterAssignee !== 'all' && i.assigneeId !== filterAssignee) return false;
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterSprint === 'backlog' && i.sprintId) return false;
    if (filterSprint !== 'all' && filterSprint !== 'backlog' && i.sprintId !== filterSprint) return false;
    return true;
  });

  // Exclude subtasks from root backlog rows (subtasks nest under their parent Story/Task)
  const rootFiltered = filtered.filter(i => i.type !== 'subtask');

  // Group root issues by Sprint
  const sprintGroups = sprints.map((sprint) => ({
    sprint,
    issues: rootFiltered.filter((i) => i.sprintId === sprint.id),
  }));

  const backlogIssues = rootFiltered.filter((i) => !i.sprintId);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleCollapse = (sprintId: string) => {
    setCollapsedSprints((prev) => ({ ...prev, [sprintId]: !prev[sprintId] }));
  };

  const handleStatusChange = async (issueId: string, newStatus: Status, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    await moveIssue(issueId, newStatus);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Backlog</span>
            {currentProject && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono font-bold border border-indigo-500/20">
                {currentProject.key}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {rootFiltered.length} total issues across sprints and backlog
          </p>
        </div>

        <button onClick={() => setCreateDialogOpen(true)} className="btn-primary gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Create Issue
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>

          {/* Type Filter */}
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input text-xs w-auto">
            <option value="all">All Types</option>
            <option value="story">User Story</option>
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="epic">Epic</option>
          </select>

          {/* Priority Filter */}
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input text-xs w-auto">
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status Filter */}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input text-xs w-auto">
            <option value="all">All Statuses</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="in-review">In Review</option>
            <option value="done">Done</option>
          </select>

          {/* Assignee Filter */}
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="input text-xs w-auto">
            <option value="all">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Sprint Filter */}
          <select value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)} className="input text-xs w-auto">
            <option value="all">All Sprints</option>
            <option value="backlog">Backlog Only</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs text-indigo-300">
          <span>{selectedIds.length} issues selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                selectedIds.forEach((id) => deleteIssue(id));
                setSelectedIds([]);
              }}
              className="px-3 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Sprint Groups */}
      <div className="space-y-6">
        {sprintGroups.map(({ sprint, issues: sprintIssueList }) => {
          const isCollapsed = collapsedSprints[sprint.id];
          const totalPoints = sprintIssueList.reduce((acc, i) => acc + (i.storyPoints || 0), 0);

          return (
            <div key={sprint.id} className="card overflow-hidden">
              {/* Sprint Header */}
              <div
                onClick={() => toggleCollapse(sprint.id)}
                className="flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{sprint.name}</span>
                  <span className="pill bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs">
                    {sprintIssueList.length} issues
                  </span>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">{totalPoints} story pts</span>
              </div>

              {/* Sprint Issue Rows */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sprintIssueList.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issueId={issue.id}
                      users={users}
                      isSelected={selectedIds.includes(issue.id)}
                      onSelect={(e) => toggleSelect(issue.id, e)}
                      onClick={() => setSelectedIssue(issue)}
                      onStatusChange={(newStatus, e) => handleStatusChange(issue.id, newStatus, e)}
                    />
                  ))}
                  {sprintIssueList.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">No issues in this sprint</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Backlog Group */}
        <div className="card overflow-hidden">
          <div
            onClick={() => toggleCollapse('backlog')}
            className="flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              {collapsedSprints['backlog'] ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Backlog (Unassigned)</span>
              <span className="pill bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                {backlogIssues.length} issues
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-400">
              {backlogIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0)} story pts
            </span>
          </div>

          {!collapsedSprints['backlog'] && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {backlogIssues.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issueId={issue.id}
                  users={users}
                  isSelected={selectedIds.includes(issue.id)}
                  onSelect={(e) => toggleSelect(issue.id, e)}
                  onClick={() => setSelectedIssue(issue)}
                  onStatusChange={(newStatus, e) => handleStatusChange(issue.id, newStatus, e)}
                />
              ))}
              {backlogIssues.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">Backlog is empty</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      <IssueDrawer
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onSelectIssue={(i) => setSelectedIssue(i)}
      />

      {/* Create Modal */}
      <CreateIssueDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}

interface RowProps {
  issueId: string;
  users: any[];
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  onStatusChange: (newStatus: Status, e: React.ChangeEvent<HTMLSelectElement>) => void;
}

function IssueRow({ issueId, users, isSelected, onSelect, onClick, onStatusChange }: RowProps) {
  const { epics, issues, fetchIssueDetail, moveIssue, toggleAcceptanceCriterion } = useStore();
  const [expanded, setExpanded] = useState(false);

  // Live subscription to exact issue from Zustand store
  const issue = issues.find(i => i.id === issueId);
  if (!issue) return null;

  const assignee = users.find((u) => u.id === issue.assigneeId);

  // AUTOMATIC HIERARCHY DETECTION FOR ROW DISPLAY
  const parentEpic = (issue.type === 'epic')
    ? null
    : epics.find(e => e.id === issue.epicId || e.id === issue.parentId) ||
    issues.find(i => i.id === issue.epicId && i.type === 'epic');

  const parentStory = (issue.type === 'task' || issue.type === 'bug' || issue.type === 'subtask')
    ? issues.find(i => i.id === issue.parentId && i.type === 'story')
    : null;

  // Subtasks under this issue
  const subtasks = issues.filter(i => i.type === 'subtask' && i.parentId === issue.id);
  const criteria = issue.acceptanceCriteria || [];
  const hasExpandables = subtasks.length > 0 || issue.type === 'story';

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded && issue.type === 'story') {
      fetchIssueDetail(issue.id);
    }
    setExpanded(!expanded);
  };

  return (
    <div className={cn('transition-colors', isSelected && 'bg-indigo-50/50 dark:bg-indigo-950/20')}>
      <div
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-xs"
      >
        {/* Row expander button */}
        {hasExpandables ? (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="p-0.5 text-slate-400 hover:text-slate-200"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="w-3.5" />
        )}

        <input
          type="checkbox"
          checked={isSelected}
          onClick={onSelect}
          onChange={() => { }}
          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
        />

        <IssueTypeIcon type={issue.type} size="sm" />

        {!isUuidOrHash(issue.key) && (
          <span className="font-mono text-slate-400 font-semibold w-16 shrink-0">{issue.key}</span>
        )}

        {/* Automatic Hierarchy Path Chip */}
        {((parentEpic && getShortDisplayName(parentEpic)) || (parentStory && getShortDisplayName(parentStory))) && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-400 shrink-0">
            {parentEpic && getShortDisplayName(parentEpic) && (
              <span className="text-purple-400">{getShortDisplayName(parentEpic)}</span>
            )}
            {parentEpic && getShortDisplayName(parentEpic) && parentStory && getShortDisplayName(parentStory) && <span>⇒</span>}
            {parentStory && getShortDisplayName(parentStory) && (
              <span className="text-emerald-400">{getShortDisplayName(parentStory)}</span>
            )}
          </span>
        )}

        <span className="font-medium text-slate-900 dark:text-slate-100 flex-1 truncate">{issue.title}</span>

        <PriorityBadge priority={issue.priority} size="sm" />

        <select
          value={issue.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(e.target.value as Status, e)}
          className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-[11px] font-semibold capitalize focus:outline-none cursor-pointer"
        >
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="in-review">In Review</option>
          <option value="done">Done</option>
        </select>

        <span className="w-8 text-center font-mono font-bold text-slate-400 shrink-0">
          {issue.storyPoints ?? '-'}
        </span>

        <div className="w-6 shrink-0 flex justify-center">
          {assignee ? <UserAvatar user={assignee} size="xs" /> : <div className="w-5 h-5 rounded-full border border-dashed border-slate-400" />}
        </div>
      </div>

      {/* Expanded Subtasks & Acceptance Criteria Checklist under row */}
      {expanded && (
        <div className="bg-slate-50/80 dark:bg-slate-900/60 pl-14 pr-4 py-3 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
          {/* Acceptance Criteria Checklist */}
          {criteria.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Acceptance Criteria</span>
              </div>
              <div className="space-y-1 pl-5">
                {criteria.map((ac) => (
                  <div key={ac.id} className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleAcceptanceCriterion(ac.id)}
                      className={cn(
                        'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                        ac.completed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400 dark:border-slate-600 hover:border-blue-500'
                      )}
                    >
                      {ac.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>
                    <span className={cn('text-slate-300', ac.completed && 'line-through text-slate-500')}>
                      {ac.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : issue.type === 'story' && (
            <div className="text-xs text-slate-500 italic pl-5">No acceptance criteria added yet</div>
          )}

          {/* Subtasks Checklist */}
          {subtasks.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ListTree className="w-3.5 h-3.5 text-slate-400" />
                <span>Subtasks</span>
              </div>
              <div className="space-y-1 pl-5">
                {subtasks.map((st) => {
                  const isDone = st.status === 'done';
                  return (
                    <div key={st.id} className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => moveIssue(st.id, isDone ? 'todo' : 'done')}
                        className={cn(
                          'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                          isDone ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400 dark:border-slate-600 hover:border-blue-500'
                        )}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                      <span className={cn('text-slate-300', isDone && 'line-through text-slate-500')}>
                        {st.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
