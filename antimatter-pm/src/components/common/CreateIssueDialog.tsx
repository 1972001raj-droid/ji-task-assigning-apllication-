import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, BookOpen, CheckSquare } from 'lucide-react';
import { useStore } from '../../store';
import type { IssueType, Status, Priority } from '../../types';
import { toast } from 'sonner';
import { getUserRoleLabel, isUuidOrHash } from '../../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  defaults?: {
    type?: IssueType;
    status?: Status;
    epicId?: string;
    parentId?: string;
    sprintId?: string;
    isFirstEpic?: boolean;
    customTitle?: string;
  };
}

export function CreateIssueDialog({ open, onClose, defaults }: Props) {
  const { users, assignableUsers, sprints, epics, issues, createIssue, currentProject, fetchAssignableUsers } = useStore();

  const [type, setType] = useState<IssueType>(defaults?.type || 'epic');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>(defaults?.status || 'backlog');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [sprintId, setSprintId] = useState<string>(defaults?.sprintId || '');
  const [storyPoints, setStoryPoints] = useState<string>('');

  // Hierarchy selections
  const [selectedEpicId, setSelectedEpicId] = useState<string>(defaults?.epicId || '');
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available User Stories (type === 'story') for current project
  const availableStories = issues.filter(i => {
    if (i.type !== 'story') return false;
    if (selectedEpicId && i.epicId !== selectedEpicId && i.parentId !== selectedEpicId) return false;
    return true;
  });

  // Sync defaults when modal opens
  useEffect(() => {
    if (open) {
      if (defaults?.type && defaults.type !== 'subtask') setType(defaults.type);
      else setType('epic');

      if (defaults?.status) setStatus(defaults.status);
      if (defaults?.epicId) setSelectedEpicId(defaults.epicId);
      if (defaults?.parentId) {
        const parentObj = issues.find(i => i.id === defaults.parentId);
        if (parentObj && parentObj.type === 'story') {
          setSelectedStoryId(parentObj.id);
          if (parentObj.epicId) setSelectedEpicId(parentObj.epicId);
        }
      }
      if (defaults?.sprintId) setSprintId(defaults.sprintId);

      if (currentProject?.id) {
        fetchAssignableUsers(currentProject.id);
      }
    }
  }, [open]);

  // When story selection changes for Task, derive & lock Epic
  const handleStoryChange = (storyId: string) => {
    setSelectedStoryId(storyId);
    const story = issues.find(i => i.id === storyId);
    if (story && (story.epicId || story.parentId)) {
      setSelectedEpicId(story.epicId || story.parentId || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (type === 'story' && !selectedEpicId) {
      toast.error('User Story must belong to a Parent Epic');
      return;
    }

    if ((type === 'task' || type === 'bug') && !selectedStoryId) {
      toast.error('Task must belong to a Parent User Story');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalParentId: string | undefined = undefined;

      if (type === 'story') {
        finalParentId = selectedEpicId || undefined;
      } else if (type === 'task' || type === 'bug') {
        finalParentId = selectedStoryId || undefined;
      }

      await createIssue({
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        assigneeId: assigneeId || undefined,
        epicId: selectedEpicId || undefined,
        parentId: finalParentId,
        storyPoints: (type === 'story' || type === 'task') && storyPoints ? parseInt(storyPoints, 10) : undefined,
        sprintId: sprintId || undefined,
      });

      // Reset and close
      setTitle('');
      setDescription('');
      setSelectedEpicId('');
      setSelectedStoryId('');
      setStoryPoints('');
      onClose();
    } catch (err) {
      // Error handled by store toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const headerTitle = defaults?.customTitle || (defaults?.isFirstEpic
    ? `Create the first Epic for ${currentProject?.name || 'Project'}`
    : 'Create New Issue');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl px-6 sm:px-10 py-6 overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{headerTitle}</span>
                {currentProject && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-xs font-semibold border border-indigo-500/20">
                    {currentProject.key}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enforced Hierarchy: Project → Epic → User Story → Task → Subtask</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto px-1.5 pr-2 flex-1">

            {/* Type Selector (No Subtask) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Issue Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'epic', label: 'Epic', icon: Layers, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
                  { id: 'story', label: 'User Story', icon: BookOpen, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                  { id: 'task', label: 'Task', icon: CheckSquare, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
                ].map((t) => {
                  const Icon = t.icon;
                  const selected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id as IssueType)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                        selected
                          ? `${t.color} border-2 shadow-sm scale-[1.02]`
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CONDITIONAL HIERARCHY SELECTORS */}

            {/* 1. Epic Selector (Required for User Story) */}
            {type === 'story' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Parent Epic <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedEpicId}
                  onChange={(e) => setSelectedEpicId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  required
                >
                  <option value="">Select Parent Epic...</option>
                  {epics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.key && !isUuidOrHash(epic.key) ? `${epic.key}: ` : ''}{epic.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Parent User Story Selector (Required for Task) */}
            {type === 'task' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Parent User Story <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedStoryId}
                  onChange={(e) => handleStoryChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  required
                >
                  <option value="">Select Parent User Story...</option>
                  {availableStories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.key && !isUuidOrHash(story.key) ? `${story.key}: ` : ''}{story.title}
                    </option>
                  ))}
                </select>
                {selectedEpicId && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Derived Epic: <span className="font-semibold text-indigo-400">{epics.find(e => e.id === selectedEpicId)?.title || selectedEpicId}</span>
                  </p>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Summary / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400"
                required
              />
            </div>

            {/* Grid 1: Status, Priority, Sprint */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="in-review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Sprint
                </label>
                <select
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="">No sprint (Backlog)</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid 2: Assignee, Story Points (Story Points hidden for Epic) */}
            <div className={`grid ${type === 'epic' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Assignee (Developer / Tester)
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="">Unassigned</option>
                  {(((assignableUsers && assignableUsers.length > 0) ? assignableUsers : (users || []).filter(u => !u.isSuperuser && u.role !== 'ADMIN'))).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({getUserRoleLabel(u)})
                    </option>
                  ))}
                </select>
              </div>

              {type !== 'epic' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Story Points / Estimate
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    placeholder="e.g. 5"
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Detailed explanation, requirements, or steps to reproduce..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Creating...' : `Create ${type === 'story' ? 'User Story' : type.charAt(0).toUpperCase() + type.slice(1)}`}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

