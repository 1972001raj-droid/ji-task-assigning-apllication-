import { useState } from 'react';
import { Moon, Sun, RotateCcw, Trash2, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { useStore } from '../store';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { CreateUserDialog } from '../components/common/CreateUserDialog';
import { canDeleteProject } from '../lib/permissions';
import { toast } from 'sonner';

export function Settings() {
  const { theme, toggleTheme, fetchInitialData, currentProject, deleteProject, users, currentUserId } = useStore();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const currentUser = users.find(u => u.id === currentUserId);
  const isDeleteAuthorized = canDeleteProject(currentUser);

  const isAdmin = currentUser?.isSuperuser || currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.roles?.some(r => r.toUpperCase().includes('ADMIN'));
  const isManager = currentUser?.role?.toUpperCase().includes('MANAGER') || currentUser?.roles?.some(r => r.toUpperCase().includes('MANAGER'));
  const canProvision = isAdmin || isManager;

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage workspace preferences and application data.
        </p>
      </div>

      {/* User Provisioning Section (Admin / Manager) */}
      {canProvision && (
        <div className="card p-6 space-y-4 border-indigo-200/60 dark:border-indigo-900/40">
          <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> User Provisioning & Team Access
            </span>
            <button
              onClick={() => setCreateUserOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Create Manager' : 'Create Developer/Tester'}</span>
            </button>
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAdmin
              ? 'As an Administrator, you can provision Manager accounts for organizations.'
              : 'As a Manager, you can provision Developer/Tester accounts for your project.'}
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.slice(0, 10).map((u) => (
              <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</span>
                  <span className="text-slate-400 ml-2">({u.email})</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                  {u.role || 'Member'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme */}
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
          <button onClick={() => setClearConfirm(true)} className="btn-danger">
            <Trash2 className="w-4 h-4" /> Clear Local Data
          </button>
        </div>
      </div>

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

      <CreateUserDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
      />
    </div>
  );
}


