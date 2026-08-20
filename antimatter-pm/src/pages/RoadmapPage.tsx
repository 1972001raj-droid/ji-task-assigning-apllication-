import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Map, Target, Sparkles, Plus } from 'lucide-react';
import { useStore } from '../store';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import { CreateIssueDialog } from '../components/common/CreateIssueDialog';
import { cn, isUuidOrHash, statusLabel } from '../lib/utils';
import type { Issue } from '../types';

const DAY_MS = 86400000;
const QUARTERS_VISIBLE = 4;

function startOfQuarter(year: number, q: number) {
  return new Date(year, (q - 1) * 3, 1);
}

function endOfQuarter(year: number, q: number) {
  return new Date(year, q * 3, 0);
}

function quarterOf(d: Date) {
  return { year: d.getFullYear(), q: Math.floor(d.getMonth() / 3) + 1 };
}

function addQuarters(year: number, q: number, n: number) {
  const total = year * 4 + (q - 1) + n;
  return { year: Math.floor(total / 4), q: (total % 4) + 1 };
}

export function RoadmapPage() {
  const { epics, issues, sprints, users, currentProject } = useStore();
  const [selectedEpic, setSelectedEpic] = useState<Issue | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const today = new Date();
  const [{ year, q }, setAnchor] = useState(() => quarterOf(today));

  const stories = useMemo(() => issues.filter((i) => i.type === 'story'), [issues]);

  const quarters = useMemo(() => {
    return Array.from({ length: QUARTERS_VISIBLE }).map((_, i) => {
      const { year: y, q: qq } = addQuarters(year, q, i);
      return { year: y, q: qq, start: startOfQuarter(y, qq), end: endOfQuarter(y, qq) };
    });
  }, [year, q]);

  const viewStart = quarters[0].start;
  const viewEnd = quarters[quarters.length - 1].end;

  const epicRows = useMemo(() => {
    return epics.map((epic) => {
      const children = stories.filter((s) => s.epicId === epic.id);
      
      // Calculate start and end date from actual linked stories, sprints, or epic dates
      const dates: number[] = [];
      if (epic.startDate) dates.push(new Date(epic.startDate).getTime());
      if (epic.dueDate) dates.push(new Date(epic.dueDate).getTime());

      for (const c of children) {
        if (c.sprintId) {
          const sp = sprints.find((s) => s.id === c.sprintId);
          if (sp) {
            if (sp.startDate) dates.push(new Date(sp.startDate).getTime());
            if (sp.endDate) dates.push(new Date(sp.endDate).getTime());
          }
        }
        if (c.dueDate) dates.push(new Date(c.dueDate).getTime());
        if (c.createdAt) dates.push(new Date(c.createdAt).getTime());
      }

      let start: Date;
      let end: Date;

      if (dates.length > 0) {
        start = new Date(Math.min(...dates));
        end = new Date(Math.max(...dates));
        // Ensure minimum 14 day width for visibility
        if (end.getTime() - start.getTime() < 14 * DAY_MS) {
          end = new Date(start.getTime() + 30 * DAY_MS);
        }
      } else {
        // Fallback to active quarter
        const base = new Date();
        start = new Date(base.getFullYear(), base.getMonth(), 1);
        end = new Date(start.getTime() + 45 * DAY_MS);
      }

      const doneCount = children.filter((c) => c.status === 'done').length;
      const progress = children.length > 0 ? Math.round((doneCount / children.length) * 100) : (epic.status === 'done' ? 100 : 0);

      const owner = users.find((u) => u.id === epic.ownerId);

      return { epic, children, start, end, progress, owner };
    });
  }, [epics, stories, sprints, users]);

  const labelWidth = 280;

  const pctFor = (d: Date) => {
    const t = Math.max(viewStart.getTime(), Math.min(viewEnd.getTime(), d.getTime()));
    return ((t - viewStart.getTime()) / (viewEnd.getTime() - viewStart.getTime())) * 100;
  };

  const todayPct = today >= viewStart && today <= viewEnd ? pctFor(today) : null;

  const handleOpenEpic = (epicId: string) => {
    const epicIssue = issues.find((i) => i.id === epicId) || {
      id: epicId,
      key: epics.find((e) => e.id === epicId)?.key || 'EPIC',
      type: 'epic' as const,
      title: epics.find((e) => e.id === epicId)?.title || 'Epic',
      description: epics.find((e) => e.id === epicId)?.description || '',
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Map className="w-6 h-6 text-violet-500" />
            <span>Quarterly Roadmap</span>
            {currentProject && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-mono font-bold border border-violet-500/20">
                {currentProject.key}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quarterly view of epics, strategic initiatives, and delivery progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor(addQuarters(year, q, -1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
            title="Previous Quarter"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnchor(quarterOf(new Date()))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setAnchor(addQuarters(year, q, 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
            title="Next Quarter"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCreateDialogOpen(true)}
            className="btn-primary gap-1.5 text-xs ml-2"
          >
            <Plus className="w-3.5 h-3.5" /> Create Epic
          </button>
        </div>
      </div>

      {/* Main Roadmap Board */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[950px]">
            {/* Timeline Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 sticky top-0 z-10 select-none">
              <div
                className="shrink-0 border-r border-slate-200 dark:border-slate-800 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400"
                style={{ width: labelWidth }}
              >
                Initiative / Epic
              </div>
              <div className="flex flex-1">
                {quarters.map((qt) => {
                  const isCurrent = today >= qt.start && today <= qt.end;
                  return (
                    <div
                      key={`${qt.year}-${qt.q}`}
                      className={cn(
                        "flex-1 border-r border-slate-200 dark:border-slate-800 px-3 py-2.5",
                        isCurrent && "bg-indigo-50/40 dark:bg-indigo-950/20"
                      )}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className={cn("text-sm font-bold", isCurrent ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-slate-200")}>
                          Q{qt.q}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{qt.year}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {qt.start.toLocaleString('en-US', { month: 'short' })} – {qt.end.toLocaleString('en-US', { month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline Rows Container */}
            <div className="relative">
              {/* Vertical Today Line */}
              {todayPct !== null && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-rose-500"
                  style={{ left: `calc(${labelWidth}px + (100% - ${labelWidth}px) * ${todayPct / 100})` }}
                >
                  <span className="absolute -top-1 left-1.5 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                    Today
                  </span>
                </div>
              )}

              {/* Empty State */}
              {epicRows.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-slate-400 gap-2">
                  <Sparkles className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No epics found in this project</p>
                  <p className="text-xs">Create an epic to start tracking your quarterly roadmap.</p>
                  <button
                    onClick={() => setCreateDialogOpen(true)}
                    className="btn-secondary text-xs mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create First Epic
                  </button>
                </div>
              )}

              {/* Epic Rows */}
              {epicRows.map(({ epic, children, start, end, progress, owner }) => {
                const leftPct = pctFor(start);
                const rightPct = pctFor(end);
                const widthPct = Math.max(4, rightPct - leftPct);
                const color = epic.color || '#8b5cf6';

                return (
                  <div
                    key={epic.id}
                    className="flex border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Left Meta Info */}
                    <div
                      className="shrink-0 border-r border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between"
                      style={{ width: labelWidth }}
                    >
                      <button
                        onClick={() => handleOpenEpic(epic.id)}
                        className="block w-full text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                            {epic.title}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          {!isUuidOrHash(epic.key) && <span className="font-mono text-slate-400">{epic.key}</span>}
                          <span>•</span>
                          <span>{children.length} {children.length === 1 ? 'story' : 'stories'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-indigo-400 font-bold">
                            <Target className="w-3 h-3" /> {progress}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <PriorityBadge priority={epic.priority} />
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {statusLabel(epic.status as any)}
                          </span>
                          {owner && <UserAvatar user={owner} size="xs" />}
                        </div>
                      </button>
                    </div>

                    {/* Right Timeline Bar Area */}
                    <div className="relative flex-1 py-4 px-1 flex items-center">
                      {/* Quarter column vertical divider lines */}
                      <div className="absolute inset-y-0 flex w-full pointer-events-none">
                        {quarters.map((_, i) => (
                          <div key={i} className="flex-1 border-r border-slate-100 dark:border-slate-800/60" />
                        ))}
                      </div>

                      {/* Bar */}
                      <div
                        onClick={() => handleOpenEpic(epic.id)}
                        className="group/bar relative h-9 cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all hover:scale-[1.005] hover:shadow-md select-none"
                        style={{
                          marginLeft: `${leftPct}%`,
                          width: `${widthPct}%`,
                          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        }}
                      >
                        {/* Progress Fill */}
                        <div
                          className="absolute inset-y-0 left-0 bg-white/20 dark:bg-white/25 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                        {/* Text Label */}
                        <div className="relative flex h-full items-center justify-between px-3 text-[11px] font-bold text-white">
                          <span className="truncate drop-shadow-sm">{epic.title}</span>
                          <span className="ml-2 shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-mono tabular-nums">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <IssueDrawer issue={selectedEpic} onClose={() => setSelectedEpic(null)} />
      <CreateIssueDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        defaults={{ type: 'epic' }}
      />
    </div>
  );
}
