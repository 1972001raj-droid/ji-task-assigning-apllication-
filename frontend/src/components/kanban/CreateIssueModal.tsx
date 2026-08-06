import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { issueApi } from '../../api/issueApi';
import { reportApi } from '../../api/reportApi';
import { searchApi } from '../../api/searchApi';
import { extractErrorMessage } from '../../api/client';
import { IssueType, IssuePriority, Issue } from '../../types/issue';
import { MemberWorkloadResponse } from '../../types/report';
import { Modal } from '../common/Modal';
import { AlertCircle, PlusCircle } from 'lucide-react';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssueCreated: () => void;
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  isOpen,
  onClose,
  onIssueCreated,
}) => {
  const { activeProject, estimationSettings } = useProject();

  const [issueType, setIssueType] = useState<IssueType>('STORY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [estimate, setEstimate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [parentIssueId, setParentIssueId] = useState('');

  const [potentialParents, setPotentialParents] = useState<Issue[]>([]);
  const [teamMembers, setTeamMembers] = useState<MemberWorkloadResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !activeProject) return;

    // Load team members from workload API
    reportApi
      .getWorkload(activeProject.id)
      .then((res) => setTeamMembers(res.members || []))
      .catch(() => setTeamMembers([]));
  }, [isOpen, activeProject?.id]);

  useEffect(() => {
    if (!isOpen || !activeProject) return;

    // Load candidate parent issues based on issue hierarchy rules
    if (issueType === 'EPIC') {
      setPotentialParents([]);
      setParentIssueId('');
    } else {
      let targetType: IssueType | undefined;
      if (issueType === 'STORY' || issueType === 'TASK' || issueType === 'BUG') {
        targetType = 'EPIC';
      }
      searchApi
        .searchIssues({ project_id: activeProject.id, issue_type: targetType, limit: 50 })
        .then((res) => setPotentialParents(res.items || []))
        .catch(() => setPotentialParents([]));
    }
  }, [isOpen, activeProject?.id, issueType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !title.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await issueApi.createIssue({
        project_id: activeProject.id,
        issue_type: issueType,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        estimate: estimate || undefined,
        assignee_id: assigneeId || undefined,
        parent_issue_id: parentIssueId || undefined,
      });

      setTitle('');
      setDescription('');
      setEstimate('');
      setAssigneeId('');
      setParentIssueId('');
      onIssueCreated();
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const allowedEstimateValues = estimationSettings?.allowed_values || ['1', '2', '3', '5', '8', '13', '21'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Issue" maxWidth="md">
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
              Issue Type
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as IssueType)}
              className="input-field"
            >
              <option value="EPIC">Epic</option>
              <option value="STORY">Story</option>
              <option value="TASK">Task</option>
              <option value="BUG">Bug</option>
              <option value="SUBTASK">Subtask</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as IssuePriority)}
              className="input-field"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
            Title
          </label>
          <input
            type="text"
            required
            placeholder="Issue summary..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Detailed description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
              Estimation ({estimationSettings?.scheme || 'FIBONACCI'})
            </label>
            <select
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              className="input-field"
            >
              <option value="">None / Unestimated</option>
              {allowedEstimateValues.map((val) => (
                <option key={val} value={val}>
                  {val} {estimationSettings?.scheme === 'TSHIRT' ? '' : 'pts'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="input-field"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        {issueType !== 'EPIC' && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
              Parent Issue ({issueType === 'SUBTASK' ? 'Story / Task' : 'Epic'})
            </label>
            <select
              value={parentIssueId}
              onChange={(e) => setParentIssueId(e.target.value)}
              className="input-field"
            >
              <option value="">No Parent</option>
              {potentialParents.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.issue_type}] {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            <PlusCircle size={16} />
            <span>{loading ? 'Creating...' : 'Create Issue'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
