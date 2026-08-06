import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { ActiveTab } from '../components/layout/Sidebar';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { BacklogView } from '../components/sprints/BacklogView';
import { AnalyticsView } from '../components/reports/AnalyticsView';
import { AdminView } from '../components/admin/AdminView';

interface MainDashboardProps {
  initialTab?: ActiveTab;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ initialTab = 'board' }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'board' && <KanbanBoard />}
      {activeTab === 'backlog' && <BacklogView />}
      {activeTab === 'analytics' && <AnalyticsView />}
      {activeTab === 'admin' && <AdminView />}
    </AppLayout>
  );
};
