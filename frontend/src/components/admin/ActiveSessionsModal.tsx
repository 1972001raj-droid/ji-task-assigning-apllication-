import React, { useState, useEffect } from 'react';
import { authApi } from '../../api/authApi';
import { extractErrorMessage } from '../../api/client';
import { AuthSession } from '../../types/auth';
import { Modal } from '../common/Modal';
import { Key, Trash2, AlertCircle } from 'lucide-react';

interface ActiveSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await authApi.listSessions();
      setSessions(list);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadSessions();
  }, [isOpen]);

  const handleRevoke = async (sessionId: string) => {
    try {
      await authApi.revokeSession(sessionId);
      await loadSessions();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Active Auth Sessions" maxWidth="md">
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] animate-pulse">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)]">No active sessions found</div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-between gap-4"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Key size={14} className="text-[var(--accent-primary)]" />
                  <span className="truncate">{s.user_agent || 'Browser Session Device'}</span>
                  {s.is_current && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Current Device
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  IP: {s.ip_address || 'Localhost'} &bull; Created: {new Date(s.created_at).toLocaleString()}
                </div>
              </div>

              {!s.is_current && (
                <button
                  onClick={() => handleRevoke(s.id)}
                  className="btn-secondary text-xs text-red-400 hover:bg-red-500/10 p-2"
                  title="Revoke session"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
