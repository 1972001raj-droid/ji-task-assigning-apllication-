import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { useStore } from '../store';
import type { Issue, Status } from '../types';
import { IssueCard } from '../components/kanban/IssueCard';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import { CreateIssueDialog } from '../components/common/CreateIssueDialog';
import { cn, statusLabel, statusDotColor } from '../lib/utils';

interface BoardColumnProps {
  col: Status;
  activeTab: Status;
  colIssuesCount: number;
  totalPts: number;
  onCreateClick: () => void;
  children: React.ReactNode;
}

function BoardColumn({ col, activeTab, colIssuesCount, totalPts, onCreateClick, children }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: col,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full md:w-72 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-3 flex flex-col max-h-full shadow-sm transition-colors duration-200",
        isOver && "bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-400/50",
        activeTab === col ? "flex" : "hidden md:flex"
      )}
    >
      {/* Column Sticky Header */}
      <div className="flex items-center justify-between mb-3 px-1 sticky top-0 bg-transparent shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full", statusDotColor(col))} />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {statusLabel(col)}
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800">
            {colIssuesCount}
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-indigo-400">{totalPts} pts</span>
      </div>

      {children}

      {/* Add Quick Button */}
      <button
        onClick={onCreateClick}
        className="mt-3 w-full py-2 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/10 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add task</span>
      </button>
    </div>
  );
}

const COLUMNS: Status[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];

function SortableIssueCard({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard issue={issue} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

export function SprintBoard() {
  const { issues, sprints, activeSprintId, moveIssue, currentProject } = useStore();

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createForStatus, setCreateForStatus] = useState<Status | null>(null);
  const [activeTab, setActiveTab] = useState<Status>('todo');

  const activeSprint = sprints.find((s) => s.id === activeSprintId);
  const sprintIssues = issues.filter((i) => !activeSprintId || i.sprintId === activeSprintId || i.status !== 'backlog');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const issue = issues.find((i) => i.id === event.active.id);
    if (issue) setActiveIssue(issue);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over) return;

    const issueId = active.id as string;
    const overId = over.id as string;

    let targetStatus: Status | undefined;
    if (COLUMNS.includes(overId as Status)) {
      targetStatus = overId as Status;
    } else {
      const overIssue = issues.find((i) => i.id === overId);
      if (overIssue) targetStatus = overIssue.status;
    }

    if (targetStatus) {
      await moveIssue(issueId, targetStatus, activeSprintId || undefined);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Sprint Board</span>
            {currentProject && (
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {currentProject.key}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {activeSprint ? `${activeSprint.name} · ${activeSprint.goal || 'Active Sprint'}` : 'All active project issues'}
            </p>
            {activeSprint?.dayCounterText && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                activeSprint.isOverdue || activeSprint.status === 'overdue'
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse'
                  : activeSprint.dayCounterText.toLowerCase().includes('due today')
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}>
                ⏱ {activeSprint.dayCounterText}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setCreateForStatus('todo')}
          className="flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] sm:text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all animate-fade-in whitespace-nowrap min-w-max"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          <span>Add task</span>
        </button>
      </div>

      <div className="flex md:hidden overflow-x-auto gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-850 shrink-0 select-none no-scrollbar">
        {COLUMNS.map((col) => {
          const colIssues = sprintIssues.filter((i) => i.status === col);
          const isActive = activeTab === col;
          return (
            <button
              key={col}
              onClick={() => setActiveTab(col)}
              className={`flex-1 min-w-max px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 ${isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350'
                }`}
            >
              <span>{statusLabel(col)}</span>
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800'
                }`}>
                {colIssues.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Board Columns Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start min-h-0">
          {COLUMNS.map((col) => {
            const colIssues = sprintIssues.filter((i) => i.status === col);
            const totalPts = colIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

            return (
              <BoardColumn
                key={col}
                col={col}
                activeTab={activeTab}
                colIssuesCount={colIssues.length}
                totalPts={totalPts}
                onCreateClick={() => setCreateForStatus(col)}
              >
                {/* Sortable Column List */}
                <SortableContext
                  id={col}
                  items={colIssues.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[140px]">
                    {colIssues.map((issue) => (
                      <SortableIssueCard
                        key={issue.id}
                        issue={issue}
                        onClick={() => setSelectedIssue(issue)}
                      />
                    ))}
                    {colIssues.length === 0 && (
                      <div className="h-28 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800/80 flex items-center justify-center text-xs text-slate-400 italic">
                        No issues in this status
                      </div>
                    )}
                  </div>
                </SortableContext>
              </BoardColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeIssue ? <IssueCard issue={activeIssue} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Drawer */}
      <IssueDrawer
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onSelectIssue={(iss) => setSelectedIssue(iss)}
      />

      {/* Create Modal */}
      <CreateIssueDialog
        open={createForStatus !== null}
        onClose={() => setCreateForStatus(null)}
        defaults={{ status: createForStatus ?? 'todo', sprintId: activeSprintId }}
      />
    </div>
  );
}
