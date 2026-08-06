import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { sprintApi } from '../../api/sprintApi';
import { extractErrorMessage } from '../../api/client';
import { Modal } from '../common/Modal';
import { AlertCircle, Rocket } from 'lucide-react';

interface CreateSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSprintCreated: () => void;
}

export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({
  isOpen,
  onClose,
  onSprintCreated,
}) => {
  const { activeProject } = useProject();

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await sprintApi.createSprint({
        project_id: activeProject.id,
        name: name.trim(),
        goal: goal.trim() || undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
      });

      setName('');
      setGoal('');
      setStartDate('');
      setEndDate('');
      onSprintCreated();
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Sprint" maxWidth="md">
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
            Sprint Name
          </label>
          <input
            type="text"
            required
            placeholder="Sprint 1, Iteration A..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
            Sprint Goal
          </label>
          <textarea
            rows={3}
            placeholder="Primary objective for this sprint..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
              Start Date
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
              Target End Date
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            <Rocket size={16} />
            <span>{loading ? 'Creating...' : 'Create Sprint'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
