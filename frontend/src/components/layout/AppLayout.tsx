import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar, ActiveTab } from './Sidebar';
import { CreateIssueModal } from '../kanban/CreateIssueModal';
import { ActiveSessionsModal } from '../admin/ActiveSessionsModal';
import { GlobalSearchModal } from '../search/GlobalSearchModal';
import { IssueDetailModal } from '../kanban/IssueDetailModal';
import { Issue } from '../../types/issue';

interface AppLayoutProps {
  activeTab: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onIssueCreated?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onTabChange,
  onIssueCreated,
  children,
}) => {
  const navigate = useNavigate();
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleTabChange = (tab: ActiveTab) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    if (tab === 'board') navigate('/board');
    else if (tab === 'backlog') navigate('/backlog');
    else if (tab === 'analytics') navigate('/reports');
    else if (tab === 'admin') navigate('/admin');
  };

  const handleSelectIssueFromSearch = (issue: Issue) => {
    setSelectedIssueId(issue.id);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenCreateIssue={() => setIsCreateIssueOpen(true)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenSessions={() => setIsSessionsOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">{children}</main>
      </div>

      {/* Global Modals */}
      <CreateIssueModal
        isOpen={isCreateIssueOpen}
        onClose={() => setIsCreateIssueOpen(false)}
        onIssueCreated={() => {
          if (onIssueCreated) onIssueCreated();
        }}
      />

      <ActiveSessionsModal
        isOpen={isSessionsOpen}
        onClose={() => setIsSessionsOpen(false)}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectIssue={handleSelectIssueFromSearch}
      />

      <IssueDetailModal
        issueId={selectedIssueId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onIssueUpdated={() => {
          if (onIssueCreated) onIssueCreated();
        }}
      />
    </div>
  );
};
