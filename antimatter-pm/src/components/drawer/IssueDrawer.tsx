import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, Trash2, Copy, Check, Plus, MessageSquare, ChevronRight,
  Clock, ListTree, Link2, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../store';
import type { Issue, Status, Priority, AcceptanceCriterion, Comment } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { IssueTypeIcon } from '../common/IssueTypeIcon';
import { statusLabel, formatRelativeDate, cn, issueTypeLabel, getUserRoleLabel, getEpicDisplayName, isUuidOrHash } from '../../lib/utils';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CreateIssueDialog } from '../common/CreateIssueDialog';
import { DatePicker } from '../common/DatePicker';

interface Props {
  issue: Issue | null;
  onClose: () => void;
  onSelectIssue?: (issue: Issue) => void;
}

const STATUSES: Status[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];
const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];


export function IssueDrawer({ issue: propIssue, onClose, onSelectIssue }: Props) {
  const {
    users, assignableUsers, sprints, epics, issues, currentProject,
    updateIssue, moveIssue, deleteIssue, duplicateIssue, addComment,
    addAcceptanceCriterion, toggleAcceptanceCriterion, createIssue,
    fetchIssueDetail, currentUserId,
  } = useStore();


  // Dynamically resolve live issue object from Zustand store for instant re-rendering
  const storeIssue = useStore(s =>
    s.issues.find(i => i.id === propIssue?.id) ||
    (s.epics.find(e => e.id === propIssue?.id) as any)
  );

  const issue = storeIssue || propIssue;

  const [newComment, setNewComment] = useState('');
  const [newAC, setNewAC] = useState('');
  const [showAddAC, setShowAddAC] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(issue?.title ?? '');
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [createChildModalOpen, setCreateChildModalOpen] = useState(false);
  const [createChildDefaults] = useState<any>(null);

  // Fetch full details whenever issue changes
  useEffect(() => {
    if (propIssue?.id) {
      fetchIssueDetail(propIssue.id);
      setTitleVal(propIssue.title);
    }
  }, [propIssue?.id, fetchIssueDetail]);

  if (!issue) return null;

  const reporter = users.find(u => u.id === issue.reporterId) || users.find(u => u.id === currentUserId);

  // AUTOMATIC HIERARCHY DETECTION
  const isEpic = issue.type === 'epic';
  const isStory = issue.type === 'story';
  const isTask = issue.type === 'task' || issue.type === 'bug';
  const isSubtask = issue.type === 'subtask';

  // Find Parent Objects automatically across state
  const parentEpic = isEpic
    ? null
    : epics.find(e => e.id === issue.epicId || e.id === issue.parentId) ||
      issues.find(i => i.id === issue.epicId && i.type === 'epic');

  const parentStory = isTask
    ? issues.find(i => i.id === issue.parentId && i.type === 'story')
    : isSubtask
    ? issues.find(i => i.id === (issues.find(t => t.id === issue.parentId)?.parentId) && i.type === 'story')
    : null;

  const parentTask = isSubtask
    ? issues.find(i => i.id === issue.parentId && (i.type === 'task' || i.type === 'bug'))
    : null;

  // Linked Children
  const linkedStories = isEpic
    ? issues.filter(i => i.type === 'story' && (i.epicId === issue.id || i.parentId === issue.id))
    : [];

  const linkedTasks = (isStory || isEpic)
    ? issues.filter(i => (i.type === 'task' || i.type === 'bug') && (i.parentId === issue.id || i.epicId === issue.id))
    : [];

  const linkedSubtasks = issues.filter(i => i.type === 'subtask' && i.parentId === issue.id);

  // Epic Story Progress
  const epicDoneStories = linkedStories.filter(s => s.status === 'done').length;
  const epicProgressPercent = linkedStories.length > 0 ? Math.round((epicDoneStories / linkedStories.length) * 100) : 0;
  const epicTotalPoints = linkedStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

  // Acceptance Criteria
  const issueAC = issue.acceptanceCriteria || [];

  const saveTitle = () => {
    if (titleVal.trim() && titleVal !== issue.title) {
      updateIssue(issue.id, { title: titleVal.trim() });
    }
    setEditingTitle(false);
  };

  const handleDelete = () => {
    deleteIssue(issue.id);
    onClose();
  };

  const handleDuplicate = () => {
    duplicateIssue(issue.id);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment(issue.id, newComment.trim());
    setNewComment('');
  };

  const handleAddAC = async () => {
    if (!newAC.trim()) return;
    if (!isStory) {
      toast.error('Acceptance Criteria can only be added to a User Story');
      return;
    }
    await addAcceptanceCriterion(issue.id, newAC.trim());
    setNewAC('');
    setShowAddAC(false);
  };

  // Hierarchy-Compliant Child Creation:
  // - On an Epic -> Creates a User Story (parent_issue_id = epic.id)
  // - On a User Story -> Creates a Task or Subtask (parent_issue_id = story.id)
  // - On a Task -> Creates a Subtask (parent_issue_id = task.id)
  const handleAddChildIssue = async () => {
    if (!newChildTitle.trim()) return;

    try {
      if (isEpic) {
        await createIssue({
          type: 'story',
          title: newChildTitle.trim(),
          epicId: issue.id,
          parentId: issue.id,
          projectId: (issue as any).projectId,
        });
      } else if (isStory) {
        await createIssue({
          type: 'task',
          title: newChildTitle.trim(),
          parentId: issue.id,
          epicId: issue.epicId || parentEpic?.id,
          projectId: (issue as any).projectId,
        });
      } else {
        await createIssue({
          type: 'subtask',
          title: newChildTitle.trim(),
          parentId: issue.id,
          epicId: issue.epicId || parentEpic?.id,
          projectId: (issue as any).projectId,
        });
      }
      setNewChildTitle('');
      setShowAddChild(false);
    } catch (e) {
      // Toast error handled in store
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (newStatus === issue.status) return;

    if (isStory) {
      if (newStatus === 'in-review' && issue.isEligibleForReview === false) {
        toast.warning('Story is not eligible for Review: All subtasks must be resolved');
      }
      if (newStatus === 'done' && issue.isEligibleForDone === false) {
        toast.warning('Story is not eligible for Done: All acceptance criteria and subtasks must be completed');
      }
    }

    await moveIssue(issue.id, newStatus);
  };

  return (
    <>
      {/* Dimmed Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Right Drawer Sheet (~820px wide desktop, full mobile) */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 h-full w-full max-w-[820px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* Fixed Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <IssueTypeIcon type={issue.type} />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {issueTypeLabel(issue.type)}
            </span>
            {!isUuidOrHash(issue.key) && (
              <>
                <span className="text-xs font-mono font-bold text-slate-400">/</span>
                <span className="text-xs font-mono font-bold text-indigo-400">{issue.key}</span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <StatusBadge status={issue.status} size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDuplicate}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Duplicate issue"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
              title="Delete issue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">

          {/* Left Column: Main Content (~65% width) */}
          <div className="flex-1 p-6 space-y-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">

            {/* AUTOMATIC HIERARCHY DETECTION BREADCRUMB: Project => Epic => User Story => Task */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium flex-wrap bg-slate-100/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{currentProject?.name || 'Project'}</span>
              <span className="text-slate-400 font-bold">⇒</span>

              {parentEpic && getEpicDisplayName(parentEpic) && (
                <>
                  <button
                    onClick={() => {
                      const epicObj = issues.find(i => i.id === parentEpic.id) || { id: parentEpic.id, key: parentEpic.key, type: 'epic' as const, title: parentEpic.title, description: parentEpic.description, status: 'in-progress' as const, priority: parentEpic.priority, reporterId: '', labels: [], commentCount: 0, order: 0, createdAt: '', updatedAt: '', version: 1 };
                      onSelectIssue && onSelectIssue(epicObj as any);
                    }}
                    className="text-purple-600 dark:text-purple-400 font-semibold hover:underline truncate max-w-[140px]"
                  >
                    {getEpicDisplayName(parentEpic)}
                  </button>
                  <span className="text-slate-400 font-bold">⇒</span>
                </>
              )}

              {parentStory && (
                <>
                  <button
                    onClick={() => onSelectIssue && onSelectIssue(parentStory)}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline truncate max-w-[140px]"
                  >
                    {parentStory.key && !isUuidOrHash(parentStory.key) ? `${parentStory.key}: ` : ''}{parentStory.title}
                  </button>
                  <span className="text-slate-400 font-bold">⇒</span>
                </>
              )}

              {parentTask && (
                <>
                  <button
                    onClick={() => onSelectIssue && onSelectIssue(parentTask)}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline truncate max-w-[140px]"
                  >
                    {parentTask.key && !isUuidOrHash(parentTask.key) ? `${parentTask.key}: ` : ''}{parentTask.title}
                  </button>
                  <span className="text-slate-400 font-bold">⇒</span>
                </>
              )}

              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-bold text-[11px] uppercase">
                {issue.type}
              </span>
            </div>

            {/* Editable Title */}
            <div>
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleVal}
                  onChange={e => setTitleVal(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                  className="w-full text-xl font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white px-3 py-1.5 rounded-xl border border-indigo-500 outline-none"
                />
              ) : (
                <h1
                  onClick={() => { setEditingTitle(true); setTitleVal(issue.title); }}
                  className="text-xl font-bold text-slate-900 dark:text-white hover:text-indigo-500 dark:hover:text-indigo-400 cursor-pointer transition-colors leading-tight"
                >
                  {issue.title}
                </h1>
              )}
            </div>

            {/* EPIC PROGRESS (If Epic) */}
            {isEpic && linkedStories.length > 0 && (
              <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-purple-400">
                  <span>Epic Progress ({epicDoneStories} of {linkedStories.length} User Stories done)</span>
                  <span className="font-mono">{epicProgressPercent}% ({epicTotalPoints} pts)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${epicProgressPercent}%` }} />
                </div>
              </div>
            )}

            {/* 1. ACCEPTANCE CRITERIA SECTION (USER STORIES ONLY) */}
            {isStory && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">Acceptance Criteria</span>
                  </div>
                </div>

                <div className="space-y-2.5 pl-1">
                  {issueAC.map((ac: AcceptanceCriterion) => (
                    <div key={ac.id} className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleAcceptanceCriterion(ac.id)}
                        className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                          ac.completed
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-400 dark:border-slate-600 hover:border-blue-500'
                        )}
                      >
                        {ac.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span className={cn('flex-1 leading-snug', ac.completed && 'line-through text-slate-400')}>
                        {ac.text}
                      </span>
                    </div>
                  ))}

                  {showAddAC ? (
                    <div className="flex gap-2 pt-1">
                      <input
                        autoFocus
                        value={newAC}
                        onChange={e => setNewAC(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddAC(); if (e.key === 'Escape') setShowAddAC(false); }}
                        className="flex-1 h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        placeholder="Type criterion and press Enter..."
                      />
                      <button
                        type="button"
                        onClick={handleAddAC}
                        className="px-3 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddAC(true)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add acceptance criterion</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. SUBTASKS / CHILD ISSUES SECTION (Hierarchy Compliant) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {isEpic ? 'User Stories' : isStory ? 'Tasks' : 'Subtasks'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pl-1">
                {(isEpic ? linkedStories : isStory ? linkedTasks : linkedSubtasks).map(child => {
                  const isDone = child.status === 'done';
                  return (
                    <div key={child.id} className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-200">
                      <button
                        type="button"
                        onClick={() => moveIssue(child.id, isDone ? 'todo' : 'done')}
                        className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                          isDone
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-400 dark:border-slate-600 hover:border-blue-500'
                        )}
                      >
                        {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span
                        onClick={() => onSelectIssue && onSelectIssue(child)}
                        className={cn(
                          'flex-1 leading-snug cursor-pointer hover:text-indigo-500 transition-colors',
                          isDone && 'line-through text-slate-400'
                        )}
                      >
                        {child.key && !isUuidOrHash(child.key) ? `${child.key}: ` : ''}{child.title}
                      </span>
                    </div>
                  );
                })}

                {showAddChild ? (
                  <div className="flex gap-2 pt-1">
                    <input
                      autoFocus
                      value={newChildTitle}
                      onChange={e => setNewChildTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddChildIssue(); if (e.key === 'Escape') setShowAddChild(false); }}
                      className="flex-1 h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      placeholder={`Type ${isEpic ? 'User Story' : isStory ? 'Task' : 'Subtask'} title and press Enter...`}
                    />
                    <button
                      type="button"
                      onClick={handleAddChildIssue}
                      className="px-3 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddChild(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add {isEpic ? 'User Story' : isStory ? 'Task' : 'Subtask'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. LINKED TASKS SECTION */}
            {(isStory || isEpic) && linkedTasks.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Linked tasks ({linkedTasks.length})
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {linkedTasks.map(lt => (
                    <div
                      key={lt.id}
                      onClick={() => onSelectIssue && onSelectIssue(lt)}
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IssueTypeIcon type={lt.type} size="sm" />
                        {!isUuidOrHash(lt.key) && (
                          <span className="font-mono text-xs font-semibold text-slate-400 shrink-0">{lt.key}</span>
                        )}
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{lt.title}</span>
                      </div>
                      <StatusBadge status={lt.status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QA TESTING HANDOFF & DEFECT ESCALATION */}
            {(issue.type === 'task' || issue.type === 'bug' || issue.type === 'story') && (
              <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-indigo-400" /> QA Testing & Verification Gate
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                    Status: {issue.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await moveIssue(issue.id, 'done');
                      await addComment(issue.id, 'QA Verification PASSED. Task marked Done.');
                      toast.success('Task QA Verification PASSED');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Pass & Complete
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const reason = prompt('Enter defect / failure details for the developer:');
                      if (reason) {
                        await moveIssue(issue.id, 'in-progress');
                        await addComment(issue.id, `QA Verification FAILED: ${reason}`);
                        toast.error('Task QA Verification FAILED - Returned to Developer');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" /> Fail & Report Defect
                  </button>
                </div>
              </div>
            )}

            {/* Editable Description */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                defaultValue={issue.description}
                onBlur={e => updateIssue(issue.id, { description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                placeholder="Add a detailed description..."
              />
            </div>

            {/* COMMENTS AND ACTIVITY TABS */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors pb-1 border-b-2',
                    activeTab === 'comments'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comments ({issue.comments?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors pb-1 border-b-2',
                    activeTab === 'activity'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Activity</span>
                </button>
              </div>

              {activeTab === 'comments' ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {(issue.comments || []).map((comment: Comment) => (
                      <div key={comment.id} className="flex gap-3 text-xs">
                        <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center shrink-0">
                          {comment.authorInitials || 'U'}
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{comment.authorName || 'Member'}</span>
                            <span className="text-[10px] text-slate-500">{formatRelativeDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{comment.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                      className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      placeholder="Write a comment..."
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      className="px-4 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-semibold text-slate-400">Activity history is not available yet.</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Metadata Panel (~35% width) */}
          <div className="w-full md:w-72 p-6 bg-slate-50/60 dark:bg-slate-900/30 space-y-5 shrink-0">

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={issue.status}
                onChange={e => handleStatusChange(e.target.value as Status)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize cursor-pointer"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={issue.priority}
                onChange={e => updateIssue(issue.id, { priority: e.target.value as Priority })}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize cursor-pointer"
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Assignee (Developer / Tester only for Tasks and Subtasks) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Assignee
              </label>
              <select
                value={issue.assigneeId || ''}
                onChange={e => updateIssue(issue.id, { assigneeId: e.target.value || undefined })}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {(assignableUsers.length > 0 ? assignableUsers : users.filter(u => !u.isSuperuser && u.role !== 'ADMIN')).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({getUserRoleLabel(u)})
                  </option>
                ))}
              </select>
            </div>

            {/* Story Points (Hidden for Epic and Subtask) */}
            {issue.type !== 'epic' && issue.type !== 'subtask' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Story Points
                </label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  defaultValue={issue.storyPoints || ''}
                  onBlur={e => updateIssue(issue.id, { storyPoints: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Unestimated"
                />
              </div>
            )}


            {/* Sprint */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Sprint
              </label>
              <select
                value={issue.sprintId || ''}
                onChange={e => updateIssue(issue.id, { sprintId: e.target.value || undefined })}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
              >
                <option value="">No sprint (Backlog)</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <DatePicker
                value={issue.dueDate ? issue.dueDate.substring(0, 10) : ''}
                onChange={val => updateIssue(issue.id, { dueDate: val || undefined })}
              />
            </div>

            {/* Reporter & Version Metadata */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Reporter:</span>
                <span className="font-semibold text-slate-200">{reporter?.name || 'Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-mono text-slate-300 font-bold">v{issue.version}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{formatRelativeDate(issue.createdAt)}</span>
              </div>
            </div>

          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Issue"
        message={`Are you sure you want to delete "${issue.title}" (${issue.key})? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        danger
      />

      {/* Create Child Dialog */}
      {createChildModalOpen && (
        <CreateIssueDialog
          open={createChildModalOpen}
          onClose={() => setCreateChildModalOpen(false)}
          defaults={createChildDefaults}
        />
      )}
    </>
  );
}
