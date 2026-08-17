import { useState, useEffect, useRef } from 'react';
import { Plus, Moon, Sun, Bell, Menu, LogOut } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { UserAvatar } from '../common/UserAvatar';
import { CreateIssueDialog } from '../common/CreateIssueDialog';
import { NotificationPanel } from '../common/NotificationPanel';

export function TopHeader() {
  const {
    currentUserId,
    users,
    theme,
    toggleTheme,
    notifications,
    markAllNotificationsRead,
    toggleSidebar,
  } = useStore();

  const currentUser = users.find(u => u.id === currentUserId)!;
  const unreadCount = notifications.filter(n => !n.read).length;

  const isAdmin = currentUser?.isSuperuser || currentUser?.role?.toUpperCase().includes('ADMIN') || currentUser?.roles?.some(r => r.toUpperCase().includes('ADMIN'));
  const isManager = currentUser?.role?.toUpperCase().includes('MANAGER') || currentUser?.roles?.some(r => r.toUpperCase().includes('MANAGER'));

  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [createIssueDefaults, setCreateIssueDefaults] = useState<any>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/80">

        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">

          {/* Hamburger Menu Trigger for Mobile */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-xl border border-slate-850 bg-slate-850/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 md:hidden transition-colors shrink-0"
            title="Toggle Menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Right Section: Actions & User */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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

          {/* Avatar & Logout Button */}
          <div className="flex items-center gap-2 sm:gap-3 ml-1 pl-2 sm:pl-3 border-l border-slate-800 shrink-0">
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
    </>
  );
}

