import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useProject } from '../../context/ProjectContext';
import { sprintApi } from '../../api/sprintApi';
import { issueApi } from '../../api/issueApi';
import { extractErrorMessage } from '../../api/client';
import { BoardColumn, Sprint } from '../../types/sprint';
import { Issue, IssueStatus } from '../../types/issue';
import { IssueCard } from './IssueCard';
import { IssueDetailModal } from './IssueDetailModal';
import { RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

const ALL_STATUSES: { status: IssueStatus; label: string }[] = [
  { status: 'BACKLOG', label: 'Backlog' },
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'REVIEW', label: 'In Review' },
  { status: 'DONE', label: 'Done' },
];

const DroppableColumn: React.FC<{
  status: IssueStatus;
  label: string;
  issues: Issue[];
  onCardClick: (issue: Issue) => void;
}> = ({ status, label, issues, onCardClick }) => {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 flex flex-col min-h-[550px] shadow-sm transition-all"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
          <span>{label}</span>
          <span className="w-5 h-5 rounded-full bg-[var(--bg-primary)] text-xs text-[var(--text-muted)] flex items-center justify-center font-semibold">
            {issues.length}
          </span>
        </div>
      </div>

      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 min-h-[200px]">
          {issues.length === 0 ? (
            <div className="h-32 border border-dashed border-[var(--border-color)] rounded-xl flex items-center justify-center text-xs text-[var(--text-muted)] italic">
              Drop issues here ({label})
            </div>
          ) : (
            issues.map((iss) => <IssueCard key={iss.id} issue={iss} onClick={onCardClick} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export const KanbanBoard: React.FC = () => {
  const { activeProject } = useProject();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const loadSprints = async () => {
    if (!activeProject) return;
    try {
      const list = await sprintApi.listSprints(activeProject.id);
      setSprints(list);
      const active = list.find((s) => s.status === 'ACTIVE');
      if (active) setSelectedSprintId(active.id);
    } catch {
      // ignore
    }
  };

  const loadBoard = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const board = await sprintApi.getBoard(activeProject.id, selectedSprintId || undefined);
      // Ensure all 5 standard columns are represented
      const colMap = new Map<string, Issue[]>();
      ALL_STATUSES.forEach((s) => colMap.set(s.status, []));

      (board.columns || []).forEach((c) => {
        if (colMap.has(c.status)) {
          colMap.set(c.status, c.issues || []);
        }
      });

      const formattedColumns: BoardColumn[] = ALL_STATUSES.map((s) => ({
        status: s.status,
        title: s.label,
        issues: colMap.get(s.status) || [],
      }));

      setColumns(formattedColumns);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProject) {
      loadSprints();
    }
  }, [activeProject?.id]);

  useEffect(() => {
    if (activeProject) {
      loadBoard();
    }
  }, [activeProject?.id, selectedSprintId]);

  const handleCardClick = (issue: Issue) => {
    setSelectedIssueId(issue.id);
    setIsDetailOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const issueId = event.active.id as string;
    for (const col of columns) {
      const found = col.issues.find((i) => i.id === issueId);
      if (found) {
        setActiveIssue(found);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over || !activeProject) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source column and issue
    let sourceCol: BoardColumn | undefined;
    let targetIssue: Issue | undefined;
    for (const col of columns) {
      const iss = col.issues.find((i) => i.id === activeId);
      if (iss) {
        sourceCol = col;
        targetIssue = iss;
        break;
      }
    }

    if (!sourceCol || !targetIssue) return;

    // Determine target status (over can be a column status name or another issue ID)
    let targetStatus: IssueStatus | undefined;
    if (ALL_STATUSES.some((s) => s.status === overId)) {
      targetStatus = overId as IssueStatus;
    } else {
      for (const col of columns) {
        if (col.issues.some((i) => i.id === overId)) {
          targetStatus = col.status;
          break;
        }
      }
    }

    if (!targetStatus) return;

    if (sourceCol.status !== targetStatus) {
      // Cross-column status transition
      try {
        await issueApi.transitionIssue(activeId, {
          target_status: targetStatus,
          current_version: targetIssue.version,
        });
        await loadBoard();
      } catch (err: unknown) {
        setError(`Transition failed: ${extractErrorMessage(err)}`);
        await loadBoard(); // restore
      }
    } else {
      // Same-column reordering
      const colIssues = sourceCol.issues;
      const oldIndex = colIssues.findIndex((i) => i.id === activeId);
      const newIndex = colIssues.findIndex((i) => i.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newPos = (newIndex + 1) * 1000;
        try {
          await issueApi.updateIssue(activeId, {
            version: targetIssue.version,
            position: newPos,
          });
          await loadBoard();
        } catch (err: unknown) {
          setError(`Reordering failed: ${extractErrorMessage(err)}`);
          await loadBoard();
        }
      }
    }
  };

  if (!activeProject) {
    return (
      <div className="p-12 text-center text-[var(--text-muted)] glass-panel">
        <Sparkles className="mx-auto mb-2 text-[var(--accent-primary)]" size={24} />
        Please select or create a project workspace to open the Kanban Board.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Board Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Kanban Board</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Active Workspace: <span className="font-semibold text-[var(--accent-primary)]">{activeProject.name}</span> ({activeProject.key})
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sprint Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] font-medium">Sprint Filter:</span>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="input-field text-xs py-1.5 w-52"
            >
              <option value="">All Project Issues</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          <button onClick={loadBoard} className="btn-secondary text-xs py-1.5 px-3">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* DnD Kanban Grid */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {columns.map((col) => (
            <DroppableColumn
              key={col.status}
              status={col.status}
              label={col.title}
              issues={col.issues}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue ? <IssueCard issue={activeIssue} onClick={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Issue Detail Modal */}
      <IssueDetailModal
        issueId={selectedIssueId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onIssueUpdated={loadBoard}
      />
    </div>
  );
};
