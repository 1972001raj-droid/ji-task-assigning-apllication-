import React, { useState, useEffect } from 'react';
import { IssueDetail, IssueStatus, IssuePriority } from '../../types/issue';
import { issueApi } from '../../api/issueApi';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  Send,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  MessageSquare,
  ListChecks,
  User as UserIcon,
  Sparkles,
  Layers,
  Edit2,
  Check,
} from 'lucide-react';

interface IssueDetailModalProps {
  issueId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onIssueUpdated: () => void;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issueId,
  isOpen,
  onClose,
  onIssueUpdated,
}) => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.is_superuser || user?.roles?.some((r) => r === 'ADMIN' || r === 'MANAGER');

  const [detail, setDetail] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newAcText, setNewAcText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadDetail = async () => {
    if (!issueId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await issueApi.getIssueDetail(issueId);
      setDetail(data);
      setTitleValue(data.title);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && issueId) {
      loadDetail();
    } else {
      setDetail(null);
    }
  }, [isOpen, issueId]);

  const handleUpdateTitle = async () => {
    if (!detail || !titleValue.trim() || titleValue === detail.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await issueApi.updateIssue(detail.id, {
        title: titleValue.trim(),
        version: detail.version,
      });
      setEditingTitle(false);
      await loadDetail();
      onIssueUpdated();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const handleUpdatePriority = async (newPriority: IssuePriority) => {
    if (!detail || newPriority === detail.priority) return;
    try {
      await issueApi.updateIssue(detail.id, {
        priority: newPriority,
        version: detail.version,
      });
      await loadDetail();
      onIssueUpdated();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const handleTransition = async (targetStatus: IssueStatus) => {
    if (!detail) return;
    setError(null);
    try {
      await issueApi.transitionIssue(detail.id, {
        target_status: targetStatus,
        current_version: detail.version,
      });
      await loadDetail();
      onIssueUpdated();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await issueApi.addComment(detail.id, { content: newComment });
      setNewComment('');
      await loadDetail();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddAc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !newAcText.trim()) return;
    try {
      await issueApi.addAcceptanceCriteria(detail.id, { description: newAcText });
      setNewAcText('');
      await loadDetail();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const handleToggleAc = async (acId: string, currentCompleted: boolean) => {
    try {
      await issueApi.updateAcceptanceCriteria(acId, { is_completed: !currentCompleted });
      await loadDetail();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const availableStatuses: { status: IssueStatus; label: string }[] = [
    { status: 'BACKLOG', label: 'Backlog' },
    { status: 'TODO', label: 'To Do' },
    { status: 'IN_PROGRESS', label: 'In Progress' },
    { status: 'REVIEW', label: 'In Review' },
    { status: 'DONE', label: 'Done' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={detail ? `Issue Detail: v${detail.version}` : 'Loading...'} maxWidth="lg">
      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
          Loading issue metadata...
        </div>
      ) : detail ? (
        <div className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Story Eligibility Info Banners */}
          {detail.issue_type === 'STORY' && (
            <div className="flex flex-wrap gap-2 text-xs">
              <div
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                  detail.is_eligible_for_review
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                }`}
              >
                <Sparkles size={14} />
                <span>
                  Eligible for Review:{' '}
                  <strong>{detail.is_eligible_for_review ? 'Yes (Child tasks completed)' : 'No (Tasks pending)'}</strong>
                </span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                  detail.is_eligible_for_done
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>
                  Eligible for Done:{' '}
                  <strong>{detail.is_eligible_for_done ? 'Yes (All criteria satisfied)' : 'No (Criteria incomplete)'}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Header Metadata */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge type="issueType" value={detail.issue_type} />
              <Badge type="status" value={detail.status} />
              <Badge type="priority" value={detail.priority} />
              {detail.effective_epic_id && (
                <span className="px-2 py-0.5 rounded bg-[var(--accent-blue-light)] text-[var(--accent-blue)] text-[11px] font-semibold flex items-center gap-1">
                  <Layers size={12} />
                  Epic Linked
                </span>
              )}
            </div>

            {/* Editable Title */}
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="input-field text-lg font-bold"
                  autoFocus
                />
                <button onClick={handleUpdateTitle} className="btn-primary text-xs py-2 px-3">
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditingTitle(true)}>
                <h2 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  {detail.title}
                </h2>
                <Edit2 size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="glass-card p-4">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Description</h4>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
              {detail.description || 'No description provided.'}
            </p>
          </div>

          {/* Status Transitions Controls */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Transition Workflow Status</h4>
            <div className="flex flex-wrap gap-2">
              {availableStatuses.map((s) => (
                <button
                  key={s.status}
                  disabled={detail.status === s.status}
                  onClick={() => handleTransition(s.status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    detail.status === s.status
                      ? 'bg-[var(--accent-gradient)] text-white shadow-md'
                      : 'btn-secondary opacity-80 hover:opacity-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Acceptance Criteria Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                <ListChecks size={16} />
                Acceptance Criteria ({detail.acceptance_criteria?.length || 0})
              </h4>
            </div>

            <div className="space-y-2">
              {(detail.acceptance_criteria || []).map((ac) => (
                <div
                  key={ac.id}
                  onClick={() => handleToggleAc(ac.id, ac.is_completed)}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] hover:bg-[var(--glass-bg)] cursor-pointer transition-all"
                >
                  {ac.is_completed ? (
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                  )}
                  <span className={`text-xs ${ac.is_completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                    {ac.description}
                  </span>
                </div>
              ))}

              {isManagerOrAdmin && (
                <form onSubmit={handleAddAc} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add new acceptance criterion..."
                    value={newAcText}
                    onChange={(e) => setNewAcText(e.target.value)}
                    className="input-field text-xs flex-1"
                  />
                  <button type="submit" className="btn-primary text-xs py-1.5 px-3">
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
              <MessageSquare size={16} />
              Comments ({(detail.comments || []).length})
            </h4>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {(detail.comments || []).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic">No comments yet. Start the discussion below.</p>
              ) : (
                (detail.comments || []).map((c) => (
                  <div key={c.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--accent-primary)]">{c.author?.username || 'Team Member'}</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input-field text-xs flex-1"
              />
              <button type="submit" disabled={submittingComment} className="btn-primary text-xs py-1.5 px-3">
                <Send size={14} />
                <span>{submittingComment ? 'Sending...' : 'Comment'}</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-[var(--text-muted)]">Unable to load issue details.</div>
      )}
    </Modal>
  );
};
