import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Folder,
  Shield,
  CheckCircle,
  Key,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSessions: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch, onOpenSessions }) => {
  const { user, logout, toggleDarkMode } = useAuth();
  const { projects, activeProject, selectProject } = useProject();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);

  return (
    <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
      {/* ── Left: Project Selector ── */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowProjectSelect(!showProjectSelect)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-sm hover:border-[var(--accent-orange)] text-[var(--text-primary)] text-xs font-medium transition-all"
          >
            <Folder size={14} className="text-[var(--accent-orange)]" />
            <span>{activeProject ? activeProject.name : 'Select Project'}</span>
            {activeProject && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--accent-orange-light)] text-[var(--accent-orange)] font-bold">
                {activeProject.key}
              </span>
            )}
            <ChevronDown size={12} className="text-[var(--text-muted)]" />
          </button>

          {showProjectSelect && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl z-50 py-2 animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Projects ({projects.length})
              </div>
              {projects.length === 0 ? (
                <div className="px-4 py-2 text-xs text-[var(--text-muted)]">No projects found</div>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      selectProject(p);
                      setShowProjectSelect(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors ${
                      activeProject?.id === p.id ? 'font-bold text-[var(--accent-orange)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                      {p.key}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Global Search ── */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] text-xs transition-all w-60"
        >
          <Search size={14} />
          <span>Search issues...</span>
          <kbd className="ml-auto text-[9px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border-color)] font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-orange)] transition-colors"
          title="Toggle Dark/Light Mode"
        >
          {user?.dark_mode_enabled ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors relative"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[var(--accent-orange)] text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_var(--accent-orange-glow)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl z-50 py-2 animate-fade-in max-h-96 overflow-y-auto">
              <div className="px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">Notifications</span>
                <span className="text-[10px] text-[var(--accent-orange)] font-semibold">{unreadCount} unread</span>
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">No notifications</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-[var(--border-color)] last:border-none flex items-start gap-3 transition-colors ${
                      n.is_read ? 'opacity-50' : 'bg-[var(--accent-orange-light)]'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="text-[11px] font-bold text-[var(--text-primary)]">{n.title}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{n.message}</div>
                      <div className="text-[9px] text-[var(--text-muted)] mt-1">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-[var(--accent-green)] hover:text-[var(--accent-orange)] p-1"
                        title="Mark as read"
                      >
                        <CheckCircle size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-[var(--border-color)] mx-1" />

        {/* ── User Menu ── */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--accent-gradient)] text-white font-bold flex items-center justify-center text-xs shadow-md">
              {user?.full_name ? user.full_name[0].toUpperCase() : user?.username[0].toUpperCase()}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">
                {user?.full_name || user?.username}
              </div>
              <div className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                {user?.is_superuser ? (
                  <span className="text-[var(--accent-orange)] font-bold flex items-center gap-0.5">
                    <Shield size={9} /> Admin
                  </span>
                ) : (
                  user?.roles?.[0] || 'Member'
                )}
              </div>
            </div>
            <ChevronDown size={12} className="text-[var(--text-muted)]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl z-50 py-2 animate-fade-in">
              <div className="px-4 py-2 border-b border-[var(--border-color)]">
                <div className="text-xs font-bold text-[var(--text-primary)]">{user?.full_name}</div>
                <div className="text-[10px] text-[var(--text-muted)]">@{user?.username}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{user?.email}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {user?.roles?.map((r) => (
                    <Badge key={r} type="role" value={r} />
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenSessions();
                }}
                className="w-full text-left px-4 py-2 text-[11px] flex items-center gap-2 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
              >
                <Key size={13} className="text-[var(--accent-blue)]" />
                <span>Active Sessions</span>
              </button>

              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-[11px] flex items-center gap-2 hover:bg-red-500/10 text-red-400 font-semibold transition-colors"
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
