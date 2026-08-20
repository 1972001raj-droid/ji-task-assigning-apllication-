import { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Pencil, ChevronRight, Zap, MoreHorizontal,
  X, Search, Target, CheckCircle2, AlertCircle, Trash2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useStore } from '../store';
import { api } from '../lib/api';
import { formatDate, cn, isUuidOrHash } from '../lib/utils';
import { IssueTypeIcon } from '../components/common/IssueTypeIcon';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import { toast } from 'sonner';
import { DatePicker } from '../components/common/DatePicker';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import type { Issue, Status, Priority } from '../types';

export function SprintsPage() {
  const { 
    sprints, 
    issues, 
    createSprint, 
    updateSprint, 
    deleteSprint,
    assignIssueToSprint, 
    removeIssueFromSprint,
    currentProjectId, 
    switchProject,
    users, 
    currentUserId 
  } = useStore();

  const currentUser = users.find(u => u.id === currentUserId);
  const isAdmin = currentUser?.isSuperuser || currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.roles?.some(r => r.toUpperCase().includes('ADMIN'));
  const isManager = currentUser?.role?.toUpperCase().includes('MANAGER') || currentUser?.roles?.some(r => r.toUpperCase().includes('MANAGER'));
  const canManage = isAdmin || isManager;

  // Selected Sprint State
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  // Modals / Dialogs State
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'planned' | 'completed' | 'overdue'>('planned');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Add Issues State
  const [addIssuesOpen, setAddIssuesOpen] = useState(false);
  const [addIssuesSearch, setAddIssuesSearch] = useState('');
  const [selectedBacklogIssueIds, setSelectedBacklogIssueIds] = useState<string[]>([]);

  // Drawer Issue state
  const [selectedDrawerIssue, setSelectedDrawerIssue] = useState<Issue | null>(null);

  // Complete Sprint Modal State
  const [completeSprintOpen, setCompleteSprintOpen] = useState(false);
  const [incompleteDestination, setIncompleteDestination] = useState<string>('backlog');

  // Burndown Chart State
  const [burndownData, setBurndownData] = useState<any>(null);

  // Action Menu dropdown state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Sprint More options menu state
  const [sprintMoreMenuOpen, setSprintMoreMenuOpen] = useState(false);
  const [deleteSprintConfirmOpen, setDeleteSprintConfirmOpen] = useState(false);

  // Close sprint more menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setSprintMoreMenuOpen(false);
    };
    if (sprintMoreMenuOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [sprintMoreMenuOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    if (activeMenuId) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [activeMenuId]);

  // Default selection to first active sprint or fallback to first sprint
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      const active = sprints.find(s => s.status === 'active');
      const first = active || sprints[0];
      setSelectedSprintId(first.id);
    }
  }, [sprints, selectedSprintId]);

  // Fetch Burndown data when selected sprint changes
  useEffect(() => {
    if (!selectedSprintId) return;
    const fetchBurndown = async () => {
      try {
        const res = await api.get(`/reports/burndown?sprint_id=${selectedSprintId}`);
        setBurndownData(res.data);
      } catch (e) {
        console.error('Failed to fetch burndown data from backend', e);
        setBurndownData(null);
      }
    };
    fetchBurndown();
  }, [selectedSprintId]);

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  // Compute issue progress metrics for selected sprint
  const sprintIssues = issues.filter(i => i.sprintId === selectedSprintId && i.type !== 'subtask');
  const totalPoints = sprintIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  const donePoints = sprintIssues.filter(i => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  const totalIssuesCount = sprintIssues.length;
  const doneIssuesCount = sprintIssues.filter(i => i.status === 'done').length;
  const openIssuesCount = totalIssuesCount - doneIssuesCount;
  const progressPercent = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createSprint({
      name,
      goal,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined
    });
    setName('');
    setGoal('');
    setStartDate('');
    setEndDate('');
    setCreateOpen(false);
    
    // Refetch project detail
    if (currentProjectId) {
      await switchProject(currentProjectId);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSprint || !editName.trim()) return;
    await updateSprint(selectedSprint.id, {
      name: editName,
      goal: editGoal,
      status: editStatus,
      startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
      endDate: editEndDate ? new Date(editEndDate).toISOString() : undefined
    });
    setEditOpen(false);
    
    // Refetch project detail
    if (currentProjectId) {
      await switchProject(currentProjectId);
    }
  };

  const handleStatusTransition = async (nextStatus: 'active' | 'completed') => {
    if (!selectedSprint) return;
    try {
      await updateSprint(selectedSprint.id, {
        status: nextStatus
      });
      toast.success(`Sprint status updated to ${nextStatus}`);
      if (currentProjectId) {
        await switchProject(currentProjectId);
      }
    } catch (e) {
      toast.error('Failed to transition sprint status');
    }
  };

  const handleCompleteSprintSubmit = async () => {
    if (!selectedSprint) return;
    try {
      const incompleteIssues = sprintIssues.filter(i => i.status !== 'done');
      
      if (incompleteIssues.length > 0) {
        if (incompleteDestination === 'backlog') {
          // Remove from sprint
          await Promise.all(
            incompleteIssues.map(i => removeIssueFromSprint(i.id))
          );
        } else {
          // Move to the target planned sprint
          await Promise.all(
            incompleteIssues.map(i => assignIssueToSprint(incompleteDestination, i.id))
          );
        }
      }

      await updateSprint(selectedSprint.id, {
        status: 'completed'
      });

      toast.success(`Sprint "${selectedSprint.name}" completed`);
      setCompleteSprintOpen(false);
      
      if (currentProjectId) {
        await switchProject(currentProjectId);
      }
    } catch (e) {
      toast.error('Failed to complete sprint');
    }
  };

  const handleAddIssuesSubmit = async () => {
    if (selectedBacklogIssueIds.length === 0) return;
    try {
      for (const issueId of selectedBacklogIssueIds) {
        await assignIssueToSprint(selectedSprintId, issueId);
      }
      toast.success(`Added ${selectedBacklogIssueIds.length} issues to sprint`);
      setSelectedBacklogIssueIds([]);
      setAddIssuesOpen(false);
      
      // Refetch project detail
      if (currentProjectId) {
        await switchProject(currentProjectId);
      }
    } catch (e) {
      toast.error('Failed to assign issues');
    }
  };

  // Fallback Burndown points calculated dynamically in case backend data is empty
  const getFallbackBurndownPoints = () => {
    if (!selectedSprint) return [];
    const start = new Date(selectedSprint.startDate);
    const end = new Date(selectedSprint.endDate);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const pts = [];
    for (let i = 0; i <= diffDays; i++) {
      const curr = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const ideal = Math.max(0, totalPoints - (totalPoints / diffDays) * i);
      const actual = i === 0 ? totalPoints : Math.max(donePoints, totalPoints - (donePoints / diffDays) * i);
      pts.push({
        formattedDate: curr.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        ideal: Math.round(ideal * 10) / 10,
        actual: Math.round(actual * 10) / 10,
      });
    }
    return pts;
  };

  // Map backend points array to Recharts schema
  const chartData = (burndownData?.points && burndownData.points.length > 0)
    ? burndownData.points.map((pt: any) => {
        const d = new Date(pt.date);
        return {
          formattedDate: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          ideal: pt.ideal_remaining,
          actual: pt.actual_remaining,
        };
      })
    : getFallbackBurndownPoints();

  // Formatting and Helpers

  const getPriorityArrow = (priority: Priority) => {
    if (priority === 'urgent') return <span className="text-rose-500 font-extrabold text-[13px] tracking-tighter shrink-0 select-none">⇈</span>;
    if (priority === 'high') return <span className="text-orange-500 font-extrabold text-sm shrink-0 select-none">↑</span>;
    if (priority === 'medium') return <span className="text-amber-500 font-extrabold text-sm shrink-0 select-none">=</span>;
    if (priority === 'low') return <span className="text-cyan-500 font-extrabold text-sm shrink-0 select-none">↓</span>;
    return <span className="text-slate-400 font-bold shrink-0 select-none">-</span>;
  };

  const renderStatusPill = (status: Status) => {
    let bgClass = 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300';
    let dotClass = 'bg-slate-400';
    let label = 'To Do';

    if (status === 'in-progress') {
      bgClass = 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400';
      dotClass = 'bg-sky-500';
      label = 'In Progress';
    } else if (status === 'in-review') {
      bgClass = 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
      dotClass = 'bg-amber-500';
      label = 'In Review';
    } else if (status === 'done') {
      bgClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400';
      dotClass = 'bg-emerald-500';
      label = 'Done';
    } else if (status === 'backlog') {
      bgClass = 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400';
      dotClass = 'bg-slate-400';
      label = 'Backlog';
    }

    return (
      <span className={cn("inline-flex items-center gap-1.5 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold select-none", bgClass)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
        <span className="hidden sm:inline">{label}</span>
      </span>
    );
  };

  // Filter out candidates for Add Issues Dialog (backlog issues)
  const candidateIssues = issues.filter(i => 
    !i.sprintId && 
    i.type !== 'subtask' && 
    (addIssuesSearch === '' || 
      i.title.toLowerCase().includes(addIssuesSearch.toLowerCase()) || 
      i.key.toLowerCase().includes(addIssuesSearch.toLowerCase()))
  );

  // Fallback if sprints is loading/empty
  if (sprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-center space-y-4 max-w-7xl mx-auto">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-500">
          <Calendar className="w-12 h-12" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Sprints Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Create your first sprint to start planning iterations, completing goals, and analyzing velocity.
          </p>
        </div>
        {canManage && (
          <button 
            onClick={() => setCreateOpen(true)} 
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Create First Sprint
          </button>
        )}

        {/* Create Modal */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="card w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Sprint</h2>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="e.g. Sprint 24 — Orbit" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint Goal</label>
                  <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} className="input resize-none" placeholder="Objective of the sprint..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                    <DatePicker value={startDate} onChange={(val) => setStartDate(val || '')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                    <DatePicker value={endDate} onChange={(val) => setEndDate(val || '')} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Create Sprint</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sprints</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Plan iterations and assign work to deliver in cadence.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New sprint</span>
          </button>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Sprints Nav */}
        <div className="lg:col-span-3 flex flex-row overflow-x-auto gap-3 pb-3 -mx-4 px-4 scrollbar-none lg:mx-0 lg:px-0 lg:flex-col lg:overflow-visible lg:pb-0 lg:space-y-2.5 shrink-0">
          {sprints.map((sprint) => {
            const isActive = sprint.status === 'active';
            const isSelected = sprint.id === selectedSprintId;
            const sprintCount = issues.filter(i => i.sprintId === sprint.id && i.type !== 'subtask').length;

            return (
              <div
                key={sprint.id}
                onClick={() => setSelectedSprintId(sprint.id)}
                className={cn(
                  "p-3.5 rounded-2xl cursor-pointer transition-all border text-left relative group select-none shrink-0 min-w-[200px] lg:min-w-0 lg:w-full",
                  isSelected
                    ? "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 shadow-sm"
                    : "border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      isActive ? "bg-emerald-500" : "bg-slate-400"
                    )} />
                    <span className="font-bold text-sm text-slate-855 dark:text-slate-100 truncate max-w-[130px]">
                      {sprint.name}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 dark:text-slate-550 mt-1">
                  {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                </div>

                {sprint.dayCounterText && (
                  <div className={cn(
                    "text-[10px] font-bold mt-1.5",
                    sprint.isOverdue ? "text-rose-500" :
                    sprint.status === 'completed' ? "text-emerald-500" :
                    sprint.status === 'active' ? "text-indigo-500" :
                    "text-slate-400"
                  )}>
                    {sprint.dayCounterText}
                  </div>
                )}

                <div className="text-xs text-slate-500 dark:text-slate-455 mt-2 font-medium">
                  {sprintCount} issue{sprintCount !== 1 ? 's' : ''}
                </div>

                {isSelected && (
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-550 absolute right-3 top-1/2 -translate-y-1/2 hidden lg:block" />
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Selected Sprint Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {selectedSprint && (
            <>
              {/* Sprint Work Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white select-text">
                      {selectedSprint.name}
                    </h2>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize select-none",
                      selectedSprint.status === 'active' ? 'bg-sky-500/10 text-sky-500 border border-sky-500/25' :
                      selectedSprint.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25' :
                      'bg-slate-500/10 text-slate-550 border border-slate-500/25 dark:text-slate-400'
                    )}>
                      {selectedSprint.status === 'active' && <Zap className="w-3 h-3 fill-sky-500 stroke-none" />}
                      {selectedSprint.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    {selectedSprint.goal || 'No goal specified'}
                  </p>

                  {/* Date, Points and Done info list */}
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-450 dark:text-slate-500 mt-3.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formatDate(selectedSprint.startDate)} – {formatDate(selectedSprint.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-slate-400" />
                      <span>{donePoints}/{totalPoints} pts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      <span>{doneIssuesCount}/{totalIssuesCount} done</span>
                    </div>
                    {/* Sprint Day Counter Badge (BRD §9) */}
                    {selectedSprint.dayCounterText && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                        selectedSprint.isOverdue
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/25"
                          : selectedSprint.status === 'completed'
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                          : selectedSprint.status === 'active'
                          ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/25"
                          : "bg-slate-500/10 text-slate-500 border-slate-500/25"
                      )}>
                        <AlertCircle className="w-3 h-3" />
                        {selectedSprint.dayCounterText}
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations Menu */}
                {canManage && (
                  <div className="flex items-center gap-2">
                    {selectedSprint.status === 'planned' && (
                      <button
                        onClick={() => handleStatusTransition('active')}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-650/80 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white stroke-none" />
                        <span>Start sprint</span>
                      </button>
                    )}
                    {selectedSprint.status === 'active' && (
                      <button
                        onClick={() => {
                          setIncompleteDestination('backlog');
                          setCompleteSprintOpen(true);
                        }}
                        className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-755 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold shadow-sm transition-all"
                      >
                        Complete sprint
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditName(selectedSprint.name);
                        setEditGoal(selectedSprint.goal || '');
                        setEditStatus(selectedSprint.status);
                        setEditStartDate(selectedSprint.startDate ? selectedSprint.startDate.split('T')[0] : '');
                        setEditEndDate(selectedSprint.endDate ? selectedSprint.endDate.split('T')[0] : '');
                        setEditOpen(true);
                      }}
                      className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* More actions dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSprintMoreMenuOpen(!sprintMoreMenuOpen);
                        }}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-755 text-xs font-semibold flex items-center justify-center shadow-sm transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {sprintMoreMenuOpen && (
                        <div className="absolute right-0 mt-1.5 z-30 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1.5 text-xs">
                          {selectedSprint.status !== 'active' && selectedSprint.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={async () => {
                                setSprintMoreMenuOpen(false);
                                await handleStatusTransition('active');
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-200 font-semibold transition-colors"
                            >
                              Set as active
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSprintMoreMenuOpen(false);
                              setDeleteSprintConfirmOpen(true);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-rose-500 hover:text-rose-650 font-semibold border-t border-slate-100 dark:border-slate-800/60 transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete sprint</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Slider */}
              <div className="card p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-650 dark:text-slate-400">
                  <span>Sprint progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Burndown Analytics Panel */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <span>↘ Burndown</span>
                    </h3>
                    <p className="text-xs text-slate-550 dark:text-slate-500">Remaining points over the sprint timeline</p>
                  </div>
                  {/* Custom Legend */}
                  <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>Actual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span>Ideal</span>
                    </div>
                  </div>
                </div>

                <div className="h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/50" />
                      <XAxis
                        dataKey="formattedDate"
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      {/* Ideal remaining line */}
                      <Area
                        type="monotone"
                        dataKey="ideal"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fill="none"
                        name="Ideal"
                      />
                      {/* Actual remaining line */}
                      <Area
                        type="monotone"
                        dataKey="actual"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fill="url(#actualGrad)"
                        dot={{ r: 3.5, strokeWidth: 1, fill: '#3b82f6', stroke: '#3b82f6' }}
                        name="Actual"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Issues in Sprint list */}
              <div className="card">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/85 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/10 rounded-t-2xl">
                  <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                    Issues in this sprint ({sprintIssues.length})
                  </h3>
                  <button
                    onClick={() => setAddIssuesOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add issues</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sprintIssues.map((issue) => {
                    const assignee = users.find(u => u.id === issue.assigneeId);
                    return (
                      <div
                        key={issue.id}
                        onClick={() => setSelectedDrawerIssue(issue)}
                        className="group flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/25 cursor-pointer transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <IssueTypeIcon type={issue.type} size="sm" />
                          {!isUuidOrHash(issue.key) && (
                            <span className="font-mono text-slate-450 dark:text-slate-550 font-semibold w-16 shrink-0">
                              {issue.key}
                            </span>
                          )}
                          <span className="font-semibold text-slate-900 dark:text-slate-200 truncate flex-1 pr-4">
                            {issue.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {getPriorityArrow(issue.priority)}
                          {renderStatusPill(issue.status)}
                          <span className="w-8 text-center font-mono font-bold text-slate-450 dark:text-slate-500">
                            {issue.storyPoints ?? '—'}
                          </span>
                          <div className="w-6 flex justify-center">
                            {assignee ? (
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 select-none"
                                style={{ backgroundColor: assignee.avatarColor || '#3b82f6' }}
                                title={assignee.name}
                              >
                                {assignee.initials}
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border border-dashed border-slate-350 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-550 shrink-0">
                                —
                              </div>
                            )}
                          </div>

                          {/* Action Menu Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(activeMenuId === issue.id ? null : issue.id)}
                              className={cn(
                                "p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-3 transition-all duration-150",
                                activeMenuId === issue.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              )}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {activeMenuId === issue.id && (
                              <div className="absolute right-0 mt-1 z-30 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDrawerIssue(issue);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                                >
                                  Open details
                                </button>
                                
                                {sprints
                                  .filter(s => s.id !== selectedSprintId && s.status !== 'completed')
                                  .map(s => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={async () => {
                                        await assignIssueToSprint(s.id, issue.id);
                                        setActiveMenuId(null);
                                        toast.success(`Moved to ${s.name}`);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors truncate"
                                    >
                                      Move to {s.name}
                                    </button>
                                  ))}

                                <button
                                  type="button"
                                  onClick={async () => {
                                    await removeIssueFromSprint(issue.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-rose-500 hover:text-rose-650 font-medium border-t border-slate-105 dark:border-slate-800/60 transition-colors"
                                >
                                  Remove from sprint
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {sprintIssues.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-450 space-y-1">
                      <p>No issues assigned to this sprint.</p>
                      <button
                        onClick={() => setAddIssuesOpen(true)}
                        className="text-indigo-655 hover:underline font-semibold"
                      >
                        Add issues from backlog
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Complete Sprint Modal */}
      {completeSprintOpen && selectedSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 flex flex-col space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Complete {selectedSprint.name}</h2>
              <button
                onClick={() => setCompleteSprintOpen(false)}
                className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-3">
              <p className="font-semibold text-slate-850 dark:text-slate-200">
                This sprint contains:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-semibold">
                <li><span className="text-emerald-500 font-bold">{doneIssuesCount}</span> completed issue{doneIssuesCount !== 1 ? 's' : ''}</li>
                <li><span className="text-amber-500 font-bold">{openIssuesCount}</span> incomplete issue{openIssuesCount !== 1 ? 's' : ''}</li>
              </ul>

              {openIssuesCount > 0 && (
                <div className="pt-3 space-y-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-350">
                    Move incomplete issues to:
                  </label>
                  <div className="relative">
                    <select
                      value={incompleteDestination}
                      onChange={(e) => setIncompleteDestination(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 dark:focus:border-indigo-550 transition-colors appearance-none"
                    >
                      <option value="backlog">Backlog</option>
                      {sprints
                        .filter(s => s.id !== selectedSprint.id && s.status === 'planned')
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setCompleteSprintOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSprintSubmit}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/10 transition-all"
              >
                Complete sprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sprint Modal */}
      {editOpen && selectedSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Sprint: {selectedSprint.name}</h2>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint Goal</label>
                <textarea value={editGoal} onChange={(e) => setEditGoal(e.target.value)} rows={3} className="input resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                <select 
                  value={editStatus} 
                  onChange={(e) => setEditStatus(e.target.value as any)} 
                  className="input capitalize"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                  <DatePicker value={editStartDate} onChange={(val) => setEditStartDate(val || '')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                  <DatePicker value={editEndDate} onChange={(val) => setEditEndDate(val || '')} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Issues Overlay Dialog */}
      {addIssuesOpen && selectedSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-xl p-6 flex flex-col max-h-[85vh] overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add issues from backlog</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select backlog issues to include in this iteration.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedBacklogIssueIds([]);
                  setAddIssuesOpen(false);
                }}
                className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-650"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search backlog by key or title..."
                value={addIssuesSearch}
                onChange={(e) => setAddIssuesSearch(e.target.value)}
                className="input pl-9 text-xs"
              />
            </div>

            {/* Scrollable Issues List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {candidateIssues.map((issue) => {
                const assignee = users.find(u => u.id === issue.assigneeId);
                const isSelected = selectedBacklogIssueIds.includes(issue.id);

                return (
                  <div
                    key={issue.id}
                    onClick={() => {
                      setSelectedBacklogIssueIds(prev =>
                        prev.includes(issue.id) ? prev.filter(id => id !== issue.id) : [...prev, issue.id]
                      );
                    }}
                    className={cn(
                      "flex items-center justify-between gap-3 py-2.5 px-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer rounded-xl transition-all my-1 text-xs select-none",
                      isSelected && "bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-350 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <IssueTypeIcon type={issue.type} size="sm" />
                      {!isUuidOrHash(issue.key) && (
                        <span className="font-mono text-slate-400 font-semibold w-16 shrink-0">
                          {issue.key}
                        </span>
                      )}
                      <span className="font-semibold text-slate-900 dark:text-slate-200 truncate pr-4">
                        {issue.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getPriorityArrow(issue.priority)}
                      {renderStatusPill(issue.status)}
                      <span className="w-8 text-center font-mono font-bold text-slate-400">
                        {issue.storyPoints ?? '—'}
                      </span>
                      <div className="w-6 flex justify-center">
                        {assignee ? (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: assignee.avatarColor || '#3b82f6' }}
                          >
                            {assignee.initials}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                            —
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {candidateIssues.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold">No Backlog Issues Found</p>
                  <p className="text-[11px] text-slate-400">Create new tasks or bugs in the backlog to add them here.</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedBacklogIssueIds([]);
                  setAddIssuesOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddIssuesSubmit}
                disabled={selectedBacklogIssueIds.length === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-600/10 transition-all"
              >
                Add issues
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide Detail Drawer for Issues */}
      <IssueDrawer
        issue={selectedDrawerIssue}
        onClose={() => setSelectedDrawerIssue(null)}
        onSelectIssue={(i) => setSelectedDrawerIssue(i)}
      />

      {/* Create Modal (standard placement) */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Sprint</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Sprint Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="e.g. Sprint 24 — Orbit" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Sprint Goal</label>
                <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} className="input resize-none" placeholder="What is the objective of this sprint?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                  <DatePicker value={startDate} onChange={(val) => setStartDate(val || '')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                  <DatePicker value={endDate} onChange={(val) => setEndDate(val || '')} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Sprint Confirmation Dialog */}
      <ConfirmDialog
        open={deleteSprintConfirmOpen}
        title="Delete Sprint"
        message={`Are you sure you want to delete the sprint "${selectedSprint?.name}"? This action cannot be undone and will move all its issues back to the backlog.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (selectedSprint) {
            await deleteSprint(selectedSprint.id);
            setDeleteSprintConfirmOpen(false);
            if (sprints.length > 1) {
              const remaining = sprints.filter(s => s.id !== selectedSprint.id);
              setSelectedSprintId(remaining[0]?.id || '');
            } else {
              setSelectedSprintId('');
            }
          }
        }}
        onCancel={() => setDeleteSprintConfirmOpen(false)}
        danger
      />
    </div>
  );
}
