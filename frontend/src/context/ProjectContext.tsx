import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, ProjectEstimationSettings } from '../types/project';
import { projectApi } from '../api/projectApi';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  estimationSettings: ProjectEstimationSettings | null;
  loading: boolean;
  selectProject: (p: Project | null) => void;
  refreshProjects: () => Promise<void>;
  refreshEstimationSettings: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [estimationSettings, setEstimationSettings] = useState<ProjectEstimationSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshEstimationSettings = useCallback(async () => {
    if (!activeProject) {
      setEstimationSettings(null);
      return;
    }
    try {
      const settings = await projectApi.getEstimationSettings(activeProject.id);
      setEstimationSettings(settings);
    } catch (err) {
      console.error('Failed to load estimation settings:', err);
    }
  }, [activeProject]);

  const refreshProjects = async () => {
    if (!user) {
      setProjects([]);
      setActiveProject(null);
      setEstimationSettings(null);
      return;
    }
    setLoading(true);
    try {
      const list = await projectApi.listProjects();
      setProjects(list);
      if (list.length > 0) {
        if (!activeProject || !list.some((p) => p.id === activeProject.id)) {
          setActiveProject(list[0]);
        }
      } else {
        setActiveProject(null);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, [user?.id]);

  useEffect(() => {
    if (activeProject) {
      refreshEstimationSettings();
    } else {
      setEstimationSettings(null);
    }
  }, [activeProject?.id, refreshEstimationSettings]);

  const selectProject = (p: Project | null) => {
    setActiveProject(p);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        estimationSettings,
        loading,
        selectProject,
        refreshProjects,
        refreshEstimationSettings,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
};
