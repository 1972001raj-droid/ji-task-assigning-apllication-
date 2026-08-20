import { useState, useEffect, useRef } from 'react';
import { Plus, Moon, Sun, Bell, Menu, LogOut, Search, ChevronDown, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { UserAvatar } from '../common/UserAvatar';
import { CreateIssueDialog } from '../common/CreateIssueDialog';
import { NotificationPanel } from '../common/NotificationPanel';
import { CommandPalette } from '../common/CommandPalette';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { canDeleteProject } from '../../lib/permissions';
import { cn, getUserRoleLabel } from '../../lib/utils';

export function TopHeader() {
  const {
    currentUserId,
    users,
    theme,
    toggleTheme,
    notifications,
    markAllNotificationsRead,
    toggleSidebar,
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Listen for Ctrl+K / Cmd+K to open search palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const canDelete = canDeleteProject(currentUser);

  return (
    <>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/80">

        {/* Left Section */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">

          {/* Hamburger Menu Trigger for Mobile */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-xl border border-slate-850 bg-slate-850/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 md:hidden transition-colors shrink-0"
            title="Toggle Menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Project Switcher in Header */}
          {currentProject && (
            <div className="relative shrink-0" ref={projectDropdownRef}>
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-900 transition-all duration-150 text-xs font-semibold shrink-0 cursor-pointer shadow-sm"
              >
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 font-mono text-[9px] font-bold text-indigo-600">
                  {currentProject.key}
                </span>
                <span className="truncate max-w-[120px]">{currentProject.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Project dropdown menu */}
              {projectDropdownOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 w-64 z-40 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 max-h-60 overflow-y-auto space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Switch Project</div>
                  {projects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={async () => {
                        await switchProject(proj.id);
                        setProjectDropdownOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors",
                        proj.id === currentProject?.id
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-slate-750 hover:bg-blue-50/50 hover:text-blue-600"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-[9px] font-bold shrink-0",
                          proj.id === currentProject?.id ? "bg-blue-100/50 text-blue-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {proj.key}
                        </span>
                        <span className="truncate">{proj.name}</span>
                      </div>
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(proj);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Desktop Search Bar Trigger (placed right next to Project Switcher) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 w-64 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all duration-150 text-left cursor-pointer shrink-0 shadow-sm"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Search issues, epics, people...</span>
          </button>
        </div>

        {/* Right Section: Actions & User */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Mobile Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-8 h-8 flex md:hidden items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
            title="Search"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {(isAdmin || isManager) && (
            <button
              onClick={() => setCreateIssueOpen(true)}
              className="flex items-center justify-center gap-1.5 w-8 h-8 sm:w-auto sm:px-3.5 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
              title="Create Issue"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Create</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative shrink-0" ref={notifRef}>
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

          {/* Avatar, Name, Role Badge & Logout Button */}
          <div className="flex items-center gap-2 sm:gap-3 ml-1 pl-2 sm:pl-3 border-l border-slate-800 shrink-0">
            {currentUser && (
              <div className="flex items-center gap-2">
                <UserAvatar user={currentUser} size="sm" />
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
                    {currentUser.name}
                  </span>
                  <div className="flex items-center gap-1">
                    {isAdmin ? (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Administrator
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {getUserRoleLabel(currentUser)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setLogoutConfirmOpen(true)}
              className="w-8 h-8 sm:w-auto flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-400 hover:bg-slate-800 sm:hover:bg-transparent rounded-xl transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <CreateIssueDialog
        open={createIssueOpen}
        onClose={() => { setCreateIssueOpen(false); setCreateIssueDefaults(null); }}
        defaults={createIssueDefaults}
      />

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Project"
        message={projectToDelete ? `Are you sure you want to delete the project "${projectToDelete.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (projectToDelete) {
            await deleteProject(projectToDelete.id);
            setDeleteConfirmOpen(false);
            setProjectToDelete(null);
            setProjectDropdownOpen(false);
          }
        }}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setProjectToDelete(null);
        }}
        danger
      />

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Log Out of Workspace"
        message="Are you sure you want to log out? You will need to enter your password to access your workspace again."
        confirmLabel={isLoggingOut ? "Logging out..." : "Log Out"}
        onConfirm={async () => {
          setIsLoggingOut(true);
          try {
            const { api } = await import('../../lib/api');
            await api.post('/auth/logout');
          } catch (e) {
            // ignore
          } finally {
            setIsLoggingOut(false);
            setLogoutConfirmOpen(false);
            useStore.setState({ currentUserId: null as any, users: [] });
            window.location.href = '/login';
          }
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
        danger
      />
    </>
  );
}
