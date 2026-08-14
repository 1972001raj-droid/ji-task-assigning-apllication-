import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Moon, Sun, Bell, ChevronDown, FolderPlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { UserAvatar } from '../common/UserAvatar';
import { CreateIssueDialog } from '../common/CreateIssueDialog';
import { CreateProjectDialog } from '../common/CreateProjectDialog';
import { CommandPalette } from '../common/CommandPalette';
import { NotificationPanel } from '../common/NotificationPanel';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { canDeleteProject } from '../../lib/permissions';
import type { Project } from '../../types';

export function TopHeader() {
  const {
    currentUserId,
    users,
    theme,
    toggleTheme,
    notifications,
    markAllNotificationsRead,
    projects,
    currentProject,
    switchProject,
    deleteProject,
  } = useStore();


  const currentUser = users.find(u => u.id === currentUserId)!;
  const unreadCount = notifications.filter(n => !n.read).length;

  const isAdmin = currentUser?.isSuperuser || currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.roles?.some(r => r.toUpperCase().includes('ADMIN'));
  const isManager = currentUser?.role?.toUpperCase().includes('MANAGER') || currentUser?.roles?.some(r => r.toUpperCase().includes('MANAGER'));

  const [createIssueOpen, setCreateIssueOpen] = useState(false);

  const [createIssueDefaults, setCreateIssueDefaults] = useState<any>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);


  const isDeleteAuthorized = canDeleteProject(currentUser);


  const notifRef = useRef<HTMLDivElement>(null);
  const projRef = useRef<HTMLDivElement>(null);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (projRef.current && !projRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-6 sticky top-0 z-20 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/80">
        
        {/* Left Section: Project Switcher & Search */}
        <div className="flex items-center gap-4">
          
          {/* Project Switcher */}
          <div className="relative" ref={projRef}>
            <button
              onClick={() => setProjectMenuOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700/60 bg-slate-800/60 hover:bg-slate-800 text-slate-100 text-sm font-medium transition-all shadow-sm group"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                {currentProject?.key || 'PRJ'}
              </div>
              <span className="max-w-[160px] truncate font-semibold text-slate-200">
                {currentProject?.name || 'Select Project'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform duration-200" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {projectMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-xl p-2 z-30 overflow-hidden"
                >
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Workspaces & Projects
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 my-1">
                    {projects.map((proj) => {
                      const isActive = proj.id === currentProject?.id;
                      return (
                        <div
                          key={proj.id}
                          className={`w-full flex items-center justify-between gap-1 px-2.5 py-2 rounded-xl text-xs text-left transition-colors group/item ${
                            isActive
                              ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <button
                            onClick={async () => {
                              setProjectMenuOpen(false);
                              await switchProject(proj.id);
                            }}
                            className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
                          >
                            <div className={`w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {proj.key}
                            </div>
                            <div className="flex-1 truncate">
                              <div className="truncate font-medium">{proj.name}</div>
                              {proj.description && (
                                <div className="text-[10px] text-slate-500 truncate">{proj.description}</div>
                              )}
                            </div>
                          </button>
                          {isDeleteAuthorized && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(proj);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
                              title={`Delete ${proj.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(isAdmin || isManager) && (
                    <div className="pt-1 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          setProjectMenuOpen(false);
                          setCreateProjectOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span>Create new project</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Button */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 text-slate-400 text-xs transition-colors min-w-[240px]"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">Search issues, epics, tasks...</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
              ⌘ K
            </kbd>
          </button>
        </div>

        {/* Right Section: Actions & User */}
        <div className="flex items-center gap-2.5">
          {(isAdmin || isManager) && (
            <button
              onClick={() => setCreateIssueOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create</span>
            </button>
          )}


          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(v => !v); markAllNotificationsRead(); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && <NotificationPanel />}
            </AnimatePresence>
          </div>

          {/* Avatar & Logout */}
          <div className="flex items-center gap-3 ml-1 pl-3 border-l border-slate-800">
            {currentUser && <UserAvatar user={currentUser} size="sm" />}
            <button
              onClick={async () => {
                try {
                  await import('../../lib/api').then(m => m.api.post('/auth/logout'));
                  window.location.href = '/login';
                } catch (e) {
                  window.location.href = '/login';
                }
              }}
              className="text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <CreateIssueDialog
        open={createIssueOpen}
        onClose={() => { setCreateIssueOpen(false); setCreateIssueDefaults(null); }}
        defaults={createIssueDefaults}
      />
      <CreateProjectDialog
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onCreated={() => {
          setCreateIssueDefaults({ type: 'epic', isFirstEpic: true });
          setCreateIssueOpen(true);
        }}
      />


      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ConfirmDialog
        open={!!projectToDelete}
        title="Delete Project"
        message={`Are you sure you want to delete project "${projectToDelete?.name}"? All related issues, epics, and sprints will be permanently removed.`}
        confirmLabel="Delete Project"
        danger
        onConfirm={async () => {
          if (projectToDelete) {
            const id = projectToDelete.id;
            setProjectToDelete(null);
            setProjectMenuOpen(false);
            await deleteProject(id);
          }
        }}
        onCancel={() => setProjectToDelete(null)}
      />
    </>
  );
}

