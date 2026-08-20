import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Backlog } from './pages/Backlog';
import { SprintBoard } from './pages/SprintBoard';
import { EpicsPage } from './pages/EpicsPage';
import { Reports } from './pages/Reports';
import { Team } from './pages/Team';
import { Settings } from './pages/Settings';
import { SprintsPage } from './pages/SprintsPage';
import { UserStoriesPage } from './pages/UserStoriesPage';
import { TasksPage } from './pages/TasksPage';
import { BugsPage } from './pages/BugsPage';
import { TimelinePage } from './pages/TimelinePage';
import { RoadmapPage } from './pages/RoadmapPage';
import { Login } from './pages/Login';
import { ActivateAccount } from './pages/ActivateAccount';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { useStore } from './store';
import { Loader2 } from 'lucide-react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUserId, fetchInitialData } = useStore();
  const [loading, setLoading] = useState(!currentUserId); // skip loading if already logged in
  const location = useLocation();

  useEffect(() => {
    // If currentUserId is already set (e.g. just logged in), skip re-fetching
    if (currentUserId) {
      setLoading(false);
      return;
    }
    const init = async () => {
      try {
        await fetchInitialData();
      } catch (e) {
        // Error fetching handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchInitialData, currentUserId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        
      </div>
    );
  }

  if (!currentUserId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/activate" element={<ActivateAccount />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="backlog" element={<Backlog />} />
        <Route path="board" element={<SprintBoard />} />
        <Route path="sprints" element={<SprintsPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="epics" element={<EpicsPage />} />
        <Route path="stories" element={<UserStoriesPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="bugs" element={<BugsPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="team" element={<Team />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
