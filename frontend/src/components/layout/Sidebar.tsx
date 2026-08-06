import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Kanban, ListTodo, BarChart3, ShieldCheck, PlusCircle, Zap } from 'lucide-react';

export type ActiveTab = 'board' | 'backlog' | 'analytics' | 'admin';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCreateIssue: () => void;
}

const NAV_ITEMS: {
  tab: ActiveTab;
  label: string;
  icon: React.ElementType;
  accentClass: string;
  adminOnly?: boolean;
}[] = [
  { tab: 'board', label: 'Kanban Board', icon: Kanban, accentClass: 'text-[var(--accent-orange)]' },
  { tab: 'backlog', label: 'Backlog & Sprints', icon: ListTodo, accentClass: 'text-[var(--accent-blue)]' },
  { tab: 'analytics', label: 'Reports & Analytics', icon: BarChart3, accentClass: 'text-[var(--accent-green)]' },
  { tab: 'admin', label: 'Admin & Audit', icon: ShieldCheck, accentClass: 'text-[var(--accent-orange)]', adminOnly: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onOpenCreateIssue }) => {
  const { user } = useAuth();
  const isAdmin = user?.is_superuser || user?.roles?.includes('ADMIN');

  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] backdrop-blur-xl flex flex-col justify-between p-4 h-screen overflow-y-auto">
      <div className="space-y-6">
        {/* ── Brand / Logo ── */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-gradient)] flex items-center justify-center text-white font-black text-lg shadow-lg glow-animation">
            JI
          </div>
          <div>
            <h2 className="text-sm font-extrabold leading-tight text-gradient-orange">
              Project Hub
            </h2>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">
              Workflow Engine
            </p>
          </div>
        </div>

        {/* ── Create Issue Button ── */}
        <button
          onClick={onOpenCreateIssue}
          className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent-gradient)] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle size={16} />
          <span>Create Issue</span>
        </button>

        {/* ── Navigation ── */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const isActive = activeTab === item.tab;
            const Icon = item.icon;

            return (
              <button
                key={item.tab}
                onClick={() => onTabChange(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? `bg-[var(--accent-orange-light)] ${item.accentClass} font-bold shadow-sm border border-[var(--border-hover)]`
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                <Icon size={17} className={isActive ? item.accentClass : ''} />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent-orange)] shadow-[0_0_6px_var(--accent-orange-glow)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Quick Stats Card ── */}
        <div className="mt-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">
            <Zap size={12} className="text-[var(--accent-orange)]" />
            System Status
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)] mx-auto mb-1 shadow-[0_0_8px_var(--accent-orange-glow)]" />
              <span className="text-[9px] text-[var(--text-muted)]">API</span>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] mx-auto mb-1 shadow-[0_0_8px_var(--accent-blue-glow)]" />
              <span className="text-[9px] text-[var(--text-muted)]">DB</span>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] mx-auto mb-1 shadow-[0_0_8px_var(--accent-green-glow)]" />
              <span className="text-[9px] text-[var(--text-muted)]">Auth</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="pt-4 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)] text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
          Connected
        </div>
        <div>FastAPI &middot; React &middot; TypeScript</div>
      </div>
    </aside>
  );
};
