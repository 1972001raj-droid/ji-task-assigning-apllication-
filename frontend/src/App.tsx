import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { BacklogView } from './components/sprints/BacklogView';
import { AnalyticsView } from './components/reports/AnalyticsView';
import { AdminView } from './components/admin/AdminView';

const ProtectedLayout: React.FC<{ activeTab: 'board' | 'backlog' | 'analytics' | 'admin'; children: React.ReactNode }> = ({
  activeTab,
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-gradient)] flex items-center justify-center text-white font-black text-xl animate-bounce mx-auto shadow-lg">
            JI
          </div>
          <p className="text-xs font-semibold text-[var(--text-muted)] animate-pulse">
            Connecting to FastAPI Project Management Engine...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ProjectProvider>
      <NotificationProvider>
        <AppLayout activeTab={activeTab}>{children}</AppLayout>
      </NotificationProvider>
    </ProjectProvider>
  );
};

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.is_superuser || user.roles?.includes('ADMIN')) {
    return <Navigate to="/admin" replace />;
  }
  if (user.roles?.includes('MANAGER')) {
    return <Navigate to="/reports" replace />;
  }
  return <Navigate to="/board" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/board"
            element={
              <ProtectedLayout activeTab="board">
                <KanbanBoard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/backlog"
            element={
              <ProtectedLayout activeTab="backlog">
                <BacklogView />
              </ProtectedLayout>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedLayout activeTab="analytics">
                <AnalyticsView />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedLayout activeTab="admin">
                <AdminView />
              </ProtectedLayout>
            }
          />

          {/* Alias / Dashboard Route Redirects */}
          <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
          <Route path="/dashboard/manager" element={<Navigate to="/reports" replace />} />
          <Route path="/dashboard/developer" element={<Navigate to="/board" replace />} />

          {/* Fallback */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
