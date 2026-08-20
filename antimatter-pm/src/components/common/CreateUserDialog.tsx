import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Shield, UserCheck, Lock, Mail, User, Send, CheckCircle, Copy } from 'lucide-react';
import { useStore } from '../../store';
import { api } from '../../lib/api';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateUserDialog({ open, onClose, onCreated }: Props) {
  const { users, currentUserId, organizations, projects, currentProject, provisionUser } = useStore();
  const currentUser = users.find(u => u.id === currentUserId);

  const isAdmin = currentUser?.isSuperuser || currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.roles?.some(r => r.toUpperCase().includes('ADMIN'));

  const [mode, setMode] = useState<'invite' | 'provision'>('provision');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'DEVELOPER' | 'TESTER'>(isAdmin ? 'MANAGER' : 'DEVELOPER');
  const [orgId, setOrgId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      setCreatedInviteLink(null);
      if (isAdmin) {
        setRole('MANAGER');
      } else {
        setRole('DEVELOPER');
      }
      if (organizations.length > 0) {
        setOrgId(organizations[0].id);
      }
      if (currentProject) {
        setProjectId(currentProject.id);
      } else if (projects.length > 0) {
        setProjectId(projects[0].id);
      }
    }
  }, [open, isAdmin, organizations, projects, currentProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetOrgId = orgId || organizations[0]?.id;
    const targetProjectId = projectId || currentProject?.id || projects[0]?.id;

    if (!targetOrgId) {
      setErrorMsg('Workspace Organization initialization is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'provision') {
        if (password.length < 12) {
          setErrorMsg('Password must be at least 12 characters.');
          setIsSubmitting(false);
          return;
        }

        await provisionUser({
          username: username.trim(),
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
          role,
          org_id: targetOrgId,
          project_id: targetProjectId || undefined,
        });

        toast.success(`Account for ${username} created successfully`);
        onClose();
        if (onCreated) onCreated();
      } else {
        // Invite mode
        const res = await api.post('/users/invitations', {
          email: email.trim(),
          role,
          full_name: fullName.trim() || undefined,
          org_id: targetOrgId,
          project_id: targetProjectId || undefined,
        });

        const token = res.data.invitation_token;
        const link = `${window.location.origin}/activate?token=${token}`;
        setCreatedInviteLink(link);
        toast.success(`Invitation created for ${email}`);
        await useStore.getState().fetchInitialData();
      }
    } catch (err: any) {
      const detail = err.response?.data?.error?.message || err.response?.data?.detail || err.response?.data?.message;
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to process request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    if (createdInviteLink) {
      navigator.clipboard.writeText(createdInviteLink);
      toast.success('Invitation link copied to clipboard!');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl p-6 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isAdmin ? 'Provision & Invite Accounts' : 'Provision Developer / Tester'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin ? 'Provision Manager, Developer, or Tester accounts' : 'Provision a new Developer or Tester account for your team'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher */}
          {!createdInviteLink && (
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mt-4">
              <button
                type="button"
                onClick={() => setMode('provision')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'provision'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Direct Account Creation
              </button>
              <button
                type="button"
                onClick={() => setMode('invite')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'invite'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Send Invitation Token
              </button>
            </div>
          )}

          {/* Invitation Created Card */}
          {createdInviteLink ? (
            <div className="mt-5 space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Invitation Generated</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Share this secure activation link with <strong>{email}</strong> (valid for 48 hours):
                </p>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between gap-2 text-left">
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">{createdInviteLink}</p>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedInviteLink(null);
                    setEmail('');
                    setFullName('');
                    onClose();
                  }}
                  className="btn-primary text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Role Display / Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" /> Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer font-medium"
                >
                  {isAdmin ? (
                    <>
                      <option value="MANAGER">👔 Manager</option>
                      <option value="DEVELOPER">👨‍💻 Developer</option>
                      <option value="TESTER">🧪 Tester</option>
                    </>
                  ) : (
                    <>
                      <option value="DEVELOPER">👨‍💻 Developer</option>
                      <option value="TESTER">🧪 Tester</option>
                    </>
                  )}
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Alex Johnson"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400"
                  />
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Username & Email */}
              <div className={`grid grid-cols-1 ${mode === 'provision' ? 'sm:grid-cols-2' : ''} gap-3`}>
                {mode === 'provision' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="alexj"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400"
                      />
                      <UserCheck className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400"
                    />
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Password (Only in Direct Provision mode) */}
              {mode === 'provision' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Temporary Password (Min 12 chars) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="At least 12 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={12}
                      className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400"
                    />
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                  {isSubmitting ? (
                    'Processing...'
                  ) : mode === 'invite' ? (
                    <>
                      <Send className="w-4 h-4" /> Generate Invitation
                    </>
                  ) : (
                    'Provision Account'
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
