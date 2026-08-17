import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ListTodo, KanbanSquare, Zap, Calendar, Map,
  Layers, BookOpen, CheckSquare, BarChart3, Users, Settings,
  ChevronLeft, Plus
} from 'lucide-react';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import { CreateIssueDialog } from '../common/CreateIssueDialog';
import { CreateProjectDialog } from '../common/CreateProjectDialog';
import { useState, useEffect } from 'react';
import { FolderPlus } from 'lucide-react';
import { canDeleteProject } from '../../lib/permissions';
import iattLogo from '../../assets/IATT Logo.jpeg';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/backlog',   icon: ListTodo,        label: 'Backlog' },
  { to: '/board',     icon: KanbanSquare,    label: 'Sprint Board' },
  { to: '/sprints',   icon: Zap,             label: 'Sprints' },
  { to: '/timeline',  icon: Calendar,        label: 'Timeline' },
  { to: '/roadmap',   icon: Map,             label: 'Roadmap' },
  { to: '/epics',     icon: Layers,          label: 'Epics' },
  { to: '/stories',   icon: BookOpen,        label: 'User Stories' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks' },
  { to: '/reports',   icon: BarChart3,       label: 'Reports' },
  { to: '/team',      icon: Users,           label: 'Team' },
  { to: '/settings',  icon: Settings,        label: 'Settings' },
];

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar, currentProject, users, currentUserId } = useStore();
  const currentUser = users.find(u => u.id === currentUserId);
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !sidebarCollapsed) {
        useStore.setState({ sidebarCollapsed: true });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      useStore.setState({ sidebarCollapsed: true });
    }
  }, [location, isMobile]);

  // canDeleteProject checks isSuperuser, role, and roles — same criteria as canCreateProject
  const canCreateProject = canDeleteProject(currentUser);
  console.log('AppSidebar: canCreateProject', canCreateProject);

  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {!sidebarCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => useStore.setState({ sidebarCollapsed: true })}
        />
      )}

      <motion.div
        className="fixed left-0 top-0 h-full z-30 flex flex-col glass-panel"
        style={{ borderRight: '1px solid var(--border)' }}
        animate={{
          width: isMobile ? 280 : (sidebarCollapsed ? 72 : 280),
          x: isMobile ? (sidebarCollapsed ? -280 : 0) : 0
        }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ border: '1px solid var(--border-strong)' }}
          >
            <img
              src={iattLogo}
              alt="IATT Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden flex-1"
              >
                <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  IAT Technologies
                </p>
                {currentProject && (
                  <p className="text-[11px] font-medium truncate text-indigo-400 mt-0.5 flex items-center gap-1">
                    <span className="px-1 py-0.2 rounded bg-indigo-500/20 font-mono text-[9px] font-bold">
                      {currentProject.key}
                    </span>
                    <span className="truncate">{currentProject.name}</span>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="px-3 py-3 shrink-0 space-y-2">
          {canCreateProject && (
            <button
              onClick={() => setCreateProjectOpen(true)}
              className={cn(
                'flex items-center gap-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all duration-150 shadow-md shadow-indigo-600/20',
                sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
              )}
              title="Create Project"
            >
              <FolderPlus className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Create Project</span>}
            </button>
          )}

          {canCreateProject && (
            <button
              onClick={() => setCreateIssueOpen(true)}
              className={cn(
                'flex items-center gap-2 w-full rounded-xl border border-dashed font-medium text-xs transition-all duration-150',
                sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
              )}
              style={{
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
              }}
              title="Create Issue"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Create Issue</span>}
            </button>
          )}
        </div>


        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('nav-item', isActive && 'active', sidebarCollapsed && 'justify-center px-2')
              }
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse button */}
        <div
          className="px-3 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150',
              sidebarCollapsed && 'justify-center px-2'
            )}
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.07)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.div>

      <CreateIssueDialog open={createIssueOpen} onClose={() => setCreateIssueOpen(false)} />
      <CreateProjectDialog open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} />
    </>
  );
}
