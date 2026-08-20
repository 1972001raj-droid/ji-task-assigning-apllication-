import { useState, useEffect } from 'react';
import {
  Moon, Sun, RotateCcw, Trash2, ShieldAlert, UserPlus, Users,
  KeyRound, Laptop, RefreshCw, Send, Eye, EyeOff, Loader2
} from 'lucide-react';
import { useStore } from '../store';
import { api } from '../lib/api';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { CreateUserDialog } from '../components/common/CreateUserDialog';
import { canDeleteProject } from '../lib/permissions';
import { getUserRoleLabel } from '../lib/utils';
import { toast } from 'sonner';

interface SessionItem {
  id: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

export function Settings() {
  const { theme, toggleTheme, fetchInitialData, currentProject, deleteProject, users, currentUserId, deleteUser } = useStore();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED'>('ALL');

  // Action states
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const currentUser = users.find(u => u.id === currentUserId);
  const isDeleteAuthorized = canDeleteProject(currentUser);

  const isAdmin = currentUser?.isSuperuser || currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.roles?.some(r => r.toUpperCase().includes('ADMIN'));
  const isManager = currentUser?.role?.toUpperCase().includes('MANAGER') || currentUser?.roles?.some(r => r.toUpperCase().includes('MANAGER'));
  const canProvision = isAdmin || isManager;

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get('/auth/sessions');
      setSessions(res.data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleReset = async () => {
    await fetchInitialData();
    toast.success('Project data reloaded');
    setResetConfirm(false);
  };

  const handleClear = () => {
    localStorage.clear();
    toast.success('All local storage data cleared');
    setClearConfirm(false);
  };

  const handleDeleteProject = async () => {
    if (currentProject) {
      await deleteProject(currentProject.id);
      setDeleteProjectConfirm(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch {
      // Error toasted by store
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      toast.error('New password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setChangingPass(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully. Other sessions revoked.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      toast.success('Session revoked');
      await loadSessions();
    } catch (err: any) {
      toast.error('Failed to revoke session');
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED') => {
    try {
      await api.patch(`/users/${userId}/status`, { status: newStatus });
      toast.success(`Account status updated to ${newStatus}`);
      await fetchInitialData();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleResendInvite = async (userId: string) => {
    try {
      const res = await api.post(`/users/${userId}/resend-invitation`);
      const link = `${window.location.origin}/activate?token=${res.data.invitation_token}`;
      navigator.clipboard.writeText(link);
      toast.success('New invitation link copied to clipboard!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to generate invitation');
    }
  };

  const handleGenerateReset = async (userId: string) => {
    try {
      const res = await api.post(`/users/${userId}/reset-password`);
      const link = `${window.location.origin}/reset-password?token=${res.data.reset_token}`;
      navigator.clipboard.writeText(link);
      toast.success('Password reset link copied to clipboard!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to generate reset link');
    }
  };

  const getRoleBadgeClass = (roleLabel: string) => {
    if (roleLabel === 'Admin') return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    if (roleLabel === 'Manager') return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
    if (roleLabel === 'Developer') return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30';
    if (roleLabel === 'Tester') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    return 'bg-slate-800 text-slate-300 border border-slate-700';
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || 'ACTIVE').toUpperCase();
    if (s === 'ACTIVE') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">ACTIVE</span>;
    if (s === 'INVITED') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">INVITED</span>;
    if (s === 'SUSPENDED') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">SUSPENDED</span>;
    if (s === 'DEACTIVATED') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">DEACTIVATED</span>;
    return null;
  };

  const filteredUsers = users.filter(u => {
    if (statusFilter !== 'ALL') {
      const uStatus = (u.status || 'ACTIVE').toUpperCase();
      if (uStatus !== statusFilter) return false;
    }
    if (isAdmin) return true;
    return !u.isSuperuser && !u.role?.toUpperCase().includes('ADMIN') && !u.role?.toUpperCase().includes('MANAGER');
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage workspace preferences, accounts, credentials, and security.
        </p>
      </div>

      {/* User Provisioning & Management Section */}
      {canProvision && (
        <div className="card p-6 space-y-4 border-indigo-200/60 dark:border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> User Management &amp; creating account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Manage system roles, account status lifecycle, invitations, and session revocations.'
                  : 'Provision and manage Developer / Tester team members for your project.'}
              </p>
            </div>
            <button
              onClick={() => setCreateUserOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Creating accounts / Invite Account' : 'creating Developer/Tester accounts'}</span>
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(['ALL', 'ACTIVE', 'INVITED', 'SUSPENDED', 'DEACTIVATED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${statusFilter === filter
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* User List Table */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.map((u) => {
              const roleLabel = getUserRoleLabel(u);
              const isSelf = u.id === currentUserId;
              const uStatus = (u.status || 'ACTIVE').toUpperCase();
              const canModify = isAdmin && !isSelf && !u.isSuperuser;

              return (
                <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-400">
                        {u.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name}</span>
                        {isSelf && <span className="text-[10px] text-indigo-400 font-semibold">(you)</span>}
                        {getStatusBadge(u.status)}
                      </div>
                      <p className="text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold ${getRoleBadgeClass(roleLabel)}`}>
                      {roleLabel.toUpperCase()}
                    </span>

                    {/* Actions Scoped by Status and Admin Perms */}
                    {uStatus === 'INVITED' && (
                      <button
                        onClick={() => handleResendInvite(u.id)}
                        className="btn-secondary text-[11px] px-2 py-1 flex items-center gap-1"
                        title="Copy new invitation link"
                      >
                        <Send className="w-3 h-3" /> Resend Invite
                      </button>
                    )}

                    {canModify && (
                      <>
                        {uStatus === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => handleGenerateReset(u.id)}
                              className="btn-secondary text-[11px] px-2 py-1 flex items-center gap-1"
                              title="Generate password reset link"
                            >
                              <KeyRound className="w-3 h-3" /> Reset Link
                            </button>
                            <button
                              onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                              className="btn-secondary text-[11px] px-2 py-1 text-amber-500 hover:text-amber-400"
                              title="Temporarily suspend account"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => setUserToDelete({ id: u.id, name: u.name })}
                              className="btn-secondary text-[11px] px-2 py-1 text-rose-500 hover:text-rose-400"
                              title="Deactivate account"
                            >
                              Deactivate
                            </button>
                          </>
                        )}

                        {uStatus === 'SUSPENDED' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                              className="btn-secondary text-[11px] px-2 py-1 text-emerald-500 hover:text-emerald-400"
                            >
                              Reactivate
                            </button>
                            <button
                              onClick={() => setUserToDelete({ id: u.id, name: u.name })}
                              className="btn-secondary text-[11px] px-2 py-1 text-rose-500 hover:text-rose-400"
                            >
                              Deactivate
                            </button>
                          </>
                        )}

                        {uStatus === 'DEACTIVATED' && (
                          <button
                            onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                            className="btn-secondary text-[11px] px-2 py-1 text-emerald-500 hover:text-emerald-400"
                          >
                            Reactivate Account
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile & Security Section (For all users) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password Card */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-500" /> Security &amp; Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Update your account password (minimum 12 characters). Changing password revokes all other active sessions.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input text-xs w-full"
                placeholder="Current password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password (Min 12 chars)</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input text-xs w-full pr-8"
                  placeholder="New password (12+ chars)"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input text-xs w-full"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={changingPass}
              className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-2 mt-2"
            >
              {changingPass ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Active Sessions Card */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-500" /> Active Sessions
            </h2>
            <button
              onClick={loadSessions}
              disabled={loadingSessions}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Database-backed HttpOnly cookie sessions authenticated on this account.
          </p>

          <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map((sess) => (
              <div key={sess.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {sess.ip_address || '127.0.0.1'}
                    </span>
                    {sess.is_current ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        THIS DEVICE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {sess.user_agent ? sess.user_agent.substring(0, 35) + '...' : 'Browser Session'}
                  </p>
                </div>

                {!sess.is_current && (
                  <button
                    onClick={() => handleRevokeSession(sess.id)}
                    className="btn-secondary text-[10px] px-2 py-1 text-rose-500 hover:text-rose-400 shrink-0"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-900 dark:text-white text-base">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Interface Theme</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Choose light or dark mode.</p>
          </div>
          <button onClick={toggleTheme} className="btn-secondary">
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4" /> Dark Mode
              </>
            ) : (
              <>
                <Sun className="w-4 h-4" /> Light Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data management */}
      <div className="card p-6 space-y-4 border-rose-200/60 dark:border-rose-900/40">
        <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" /> Data Management
        </h2>

        {currentProject && isDeleteAuthorized && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete Current Project ({currentProject.name})</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove this project and all associated issues, epics, and sprints.</p>
            </div>
            <button onClick={() => setDeleteProjectConfirm(true)} className="btn-danger">
              <Trash2 className="w-4 h-4" /> Delete Project
            </button>
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Refresh Workspace Data</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Re-sync all live issues, epics, and sprints from backend database.</p>
          </div>
          <button onClick={() => setResetConfirm(true)} className="btn-secondary">
            <RotateCcw className="w-4 h-4" /> Refresh Data
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Clear Local Preferences</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Clear cached theme and local session storage.</p>
          </div>
          <button onClick={handleClear} className="btn-danger">
            <Trash2 className="w-4 h-4" /> Clear Local Data
          </button>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={deleteProjectConfirm}
        title="Delete Current Project"
        message={`Are you sure you want to delete "${currentProject?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Project"
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteProjectConfirm(false)}
        danger
      />

      <ConfirmDialog
        open={resetConfirm}
        title="Refresh Workspace Data"
        message="This will re-fetch all active projects, issues, and sprints directly from the backend server. Continue?"
        confirmLabel="Refresh Now"
        onConfirm={handleReset}
        onCancel={() => setResetConfirm(false)}
      />

      <ConfirmDialog
        open={clearConfirm}
        title="Clear All Data"
        message="This will permanently wipe all issues, epics, comments, and local state. Are you sure?"
        confirmLabel="Clear Data"
        onConfirm={handleClear}
        onCancel={() => setClearConfirm(false)}
        danger
      />

      <ConfirmDialog
        open={!!userToDelete}
        title="Deactivate User Account"
        message={
          userToDelete
            ? `Are you sure you want to deactivate "${userToDelete.name}"? Their account status will be set to DEACTIVATED, all active sessions will be revoked immediately, and open issues will be unassigned.`
            : ''
        }
        confirmLabel={isDeletingUser ? 'Deactivating...' : 'Deactivate Account'}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
        danger
      />

      <CreateUserDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
      />
    </div>
  );
}
