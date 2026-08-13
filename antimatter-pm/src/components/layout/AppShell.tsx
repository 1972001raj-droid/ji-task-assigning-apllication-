import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopHeader } from './TopHeader';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';

export function AppShell() {
  const sidebarCollapsed = useStore(s => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-gradient)', backgroundAttachment: 'fixed' }}>
      {/* Sidebar */}
      <AppSidebar />

      {/* Main area */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-300',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-[280px]'
        )}
      >
        <TopHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
