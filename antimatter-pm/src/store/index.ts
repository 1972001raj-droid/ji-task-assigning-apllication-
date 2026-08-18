import { create } from 'zustand';
import { api } from '../lib/api';
import { toast } from 'sonner';
import {
  mapBackendStatusToUI,
  mapUIStatusToBackend,
  mapBackendTypeToUI,
  mapUITypeToBackend,
  mapBackendPriorityToUI,
  isUuidOrHash
} from '../lib/utils';
import type {
  User, Label, Sprint, Epic, Issue, Comment, AcceptanceCriterion,
  Subtask, ActivityEvent, Notification, Status, Priority, IssueType, EpicStatus,
  Project, Organization
} from '../types';

interface AppState {
  users: User[];
  assignableUsers: User[];
  projects: Project[];
  organizations: Organization[];
  currentProjectId: string | null;
  currentProject: Project | null;
  labels: Label[];
  sprints: Sprint[];
  epics: Epic[];
  issues: Issue[];
  comments: Comment[];
  acceptanceCriteria: AcceptanceCriterion[];
  subtasks: Subtask[];
  activity: ActivityEvent[];
  notifications: Notification[];
  currentUserId: string;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  activeSprintId: string;
  
  fetchInitialData: () => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  createProject: (data: { org_id?: string; name: string; key: string; description?: string }) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  provisionUser: (data: { username: string; email: string; password: string; full_name?: string; role: string; org_id: string; project_id?: string }) => Promise<User>;
  fetchAssignableUsers: (projectId: string) => Promise<User[]>;
  fetchProvisionedUsers: (orgId?: string, projectId?: string) => Promise<User[]>;

  
  fetchIssueDetail: (id: string) => Promise<Issue | null>;
  createIssue: (data: {
    type: IssueType;
    title: string;
    description?: string;
    priority?: Priority;
    status?: Status;
    assigneeId?: string;
    epicId?: string;
    parentId?: string;
    storyPoints?: number;
    sprintId?: string;
    projectId?: string;
  }) => Promise<Issue | null>;
  updateIssue: (id: string, data: Partial<Issue>) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;
  duplicateIssue: (id: string) => Promise<void>;
  moveIssue: (id: string, status: Status, targetSprintId?: string) => Promise<boolean>;
  bulkUpdateIssues: (ids: string[], data: Partial<Issue>) => Promise<void>;
  
  createEpic: (data: Partial<Epic>) => Promise<void>;
  deleteEpic: (id: string) => Promise<void>;
  
  createSprint: (data: Partial<Sprint>) => Promise<void>;
  assignIssueToSprint: (sprintId: string, issueId: string) => Promise<void>;
  
  addComment: (issueId: string, body: string) => Promise<void>;
  addAcceptanceCriterion: (issueId: string, text: string) => Promise<void>;
  toggleAcceptanceCriterion: (id: string) => Promise<void>;
  
  markAllNotificationsRead: () => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setActiveSprintId: (id: string) => void;
}

// Map backend Issue response object to frontend camelCase Issue with data preservation
function mapBackendIssue(b: any, existingIssue?: Issue): Issue {
  const mappedType = mapBackendTypeToUI(b.issue_type);
  const mappedStatus = mapBackendStatusToUI(b.status);
  const mappedPriority = mapBackendPriorityToUI(b.priority);

  const mappedAC: AcceptanceCriterion[] = b.acceptance_criteria !== undefined
    ? (b.acceptance_criteria || []).map((ac: any) => ({
        id: ac.id,
        issueId: ac.story_id,
        text: ac.description || ac.text || '',
        completed: !!ac.is_completed,
      }))
    : (existingIssue?.acceptanceCriteria || []);

  const mappedComments: Comment[] = b.comments !== undefined
    ? (b.comments || []).map((c: any) => ({
        id: c.id,
        issueId: c.issue_id,
        authorId: c.author_id,
        body: c.content,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        authorName: c.author?.full_name || c.author?.username,
        authorInitials: (c.author?.full_name || c.author?.username || 'U').substring(0, 2).toUpperCase(),
      }))
    : (existingIssue?.comments || []);

  return {
    id: b.id,
    key: b.key || `${b.id.substring(0, 4)}`,
    type: mappedType,
    title: b.title,
    description: b.description || '',
    status: mappedStatus,
    priority: mappedPriority,
    assigneeId: b.assignee_id,
    reporterId: b.reporter_id,
    sprintId: b.sprint_id,
    epicId: b.effective_epic_id || (mappedType === 'story' ? b.parent_issue_id : undefined),
    parentId: b.parent_issue_id,
    effectiveEpicId: b.effective_epic_id,
    storyPoints: b.estimate ? parseInt(b.estimate, 10) || undefined : undefined,
    dueDate: b.due_date,
    labels: [],
    commentCount: b.comments ? b.comments.length : (existingIssue?.commentCount || 0),
    order: b.position || 0,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    version: b.version || 1,
    isEligibleForReview: b.is_eligible_for_review !== undefined ? b.is_eligible_for_review : existingIssue?.isEligibleForReview,
    isEligibleForDone: b.is_eligible_for_done !== undefined ? b.is_eligible_for_done : existingIssue?.isEligibleForDone,
    acceptanceCriteria: mappedAC,
    comments: mappedComments,
  };
}

export const useStore = create<AppState>()((set, get) => ({
  users: [],
  assignableUsers: [],
  projects: [],
  organizations: [],
  currentProjectId: null,
  currentProject: null,
  labels: [],
  sprints: [],
  epics: [],
  issues: [],
  comments: [],
  acceptanceCriteria: [],
  subtasks: [],
  activity: [],
  notifications: [],
  currentUserId: '',
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  sidebarCollapsed: false,
  activeSprintId: '',

  fetchInitialData: async () => {
    try {
      const meRes = await api.get('/users/me');
      const me = meRes.data;
      console.log('[Store] /users/me response:', JSON.stringify(me));

      const currentUser: User = {
        id: me.id,
        name: me.full_name || me.username,
        email: me.email,
        initials: (me.full_name || me.username).substring(0, 2).toUpperCase(),
        avatarColor: '#6366f1',
        role: me.roles?.[0] || (me.is_superuser ? 'ADMIN' : 'DEVELOPER_TESTER'),
        roles: me.roles || [],
        isSuperuser: me.is_superuser || false,
      };
      console.log('[Store] currentUser built:', JSON.stringify(currentUser));

      let allUsers: User[] = [currentUser];
      try {
        const usersRes = await api.get('/users');
        if (Array.isArray(usersRes.data)) {
          allUsers = usersRes.data.map((u: any) => {
            if (u.id === me.id) {
              return currentUser;
            }
            const uRoles = u.roles || (u.is_superuser ? ['ADMIN'] : ['DEVELOPER_TESTER']);
            const primaryRole = u.is_superuser ? 'ADMIN' : (uRoles[0] || 'DEVELOPER_TESTER');
            return {
              id: u.id,
              name: u.full_name || u.username,
              email: u.email,
              initials: (u.full_name || u.username).substring(0, 2).toUpperCase(),
              avatarColor: '#3b82f6',
              role: primaryRole,
              roles: uRoles,
              isSuperuser: u.is_superuser || false,
            };
          });
        }
      } catch (e) {}


      let userProjects: Project[] = [];
      try {
        const projRes = await api.get('/projects');
        userProjects = projRes.data.map((p: any) => ({
          id: p.id,
          orgId: p.org_id,
          name: p.name,
          key: p.key,
          description: p.description,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
      } catch (e) {
        if (me.projects) {
          userProjects = me.projects.map((p: any) => ({
            id: p.id, orgId: p.org_id, name: p.name, key: p.key, description: p.description
          }));
        }
      }

      let userOrgs: Organization[] = [];
      try {
        const orgRes = await api.get('/organizations');
        userOrgs = orgRes.data.map((o: any) => ({ id: o.id, name: o.name, slug: o.slug }));
      } catch (e) {}

      let userNotifications: Notification[] = [];
      try {
        const notifRes = await api.get('/notifications');
        userNotifications = notifRes.data.map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          title: n.title || 'Notification',
          message: n.message || n.content || '',
          read: n.is_read,
          createdAt: n.created_at,
          type: n.type || 'info',
        }));
      } catch (e) {}

      const selectedProjectId = get().currentProjectId || userProjects[0]?.id || null;
      const selectedProject = userProjects.find(p => p.id === selectedProjectId) || userProjects[0] || null;

      set({
        currentUserId: currentUser.id,
        users: allUsers,
        projects: userProjects,
        organizations: userOrgs,
        notifications: userNotifications,
        currentProjectId: selectedProject?.id || null,
        currentProject: selectedProject,
      });

      if (selectedProject) {
        await get().switchProject(selectedProject.id);
      }
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string' ? errorDetail : 'Failed to connect to backend server';
      toast.error(msg);
    }
  },

  switchProject: async (projectId: string) => {
    const project = get().projects.find(p => p.id === projectId) || null;
    set({
      currentProjectId: projectId,
      currentProject: project,
      issues: [],
      epics: [],
      sprints: [],
      activeSprintId: '',
    });

    try {
      const existingIssues = get().issues;
      const issuesRes = await api.get(`/search/issues?project_id=${projectId}&limit=100`);
      const backendIssues = issuesRes.data.items || [];
      const mapped = backendIssues.map((b: any) =>
        mapBackendIssue(b, existingIssues.find(i => i.id === b.id))
      );

      // Extract Epics
      const epics: Epic[] = mapped
        .filter((i: Issue) => i.type === 'epic')
        .map((i: Issue) => ({
          id: i.id,
          key: i.key,
          title: i.title,
          description: i.description,
          status: 'in-progress' as EpicStatus,
          priority: i.priority,
          ownerId: i.assigneeId || i.reporterId,
          color: '#6366f1',
          createdAt: i.createdAt,
        }));

      // Fetch Sprints
      const sprintsRes = await api.get(`/sprints?project_id=${projectId}`);
      const sprints: Sprint[] = sprintsRes.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        goal: s.goal || '',
        startDate: s.start_date,
        endDate: s.due_date,
        status: mapBackendStatusToUI(s.status) === 'in-progress' ? 'active' : 'planned',
      }));

      set({
        issues: mapped,
        epics: epics,
        sprints: sprints,
        activeSprintId: sprints.find(s => s.status === 'active')?.id || sprints[0]?.id || '',
      });

      await get().fetchAssignableUsers(projectId);
    } catch (e: any) {
      toast.error('Failed to load project issues and sprints');
    }
  },

  provisionUser: async (data) => {
    try {
      const res = await api.post('/users/provision', data);
      const newUser: User = {
        id: res.data.id,
        name: res.data.full_name || res.data.username,
        email: res.data.email,
        initials: (res.data.full_name || res.data.username).substring(0, 2).toUpperCase(),
        avatarColor: '#3b82f6',
        role: data.role,
        roles: [data.role],
        isSuperuser: false,
      };

      set(s => ({
        users: [...s.users.filter(u => u.id !== newUser.id), newUser],
        assignableUsers: data.role === 'DEVELOPER_TESTER'
          ? [...s.assignableUsers.filter(u => u.id !== newUser.id), newUser]
          : s.assignableUsers
      }));

      toast.success(`User "${newUser.name}" provisioned successfully`);
      return newUser;
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail || e.response?.data?.message;
      const msg = typeof errorDetail === 'string'
        ? errorDetail
        : (errorDetail?.[0]?.msg || 'Failed to provision user');
      toast.error(msg);
      throw e;
    }
  },

  fetchAssignableUsers: async (projectId: string) => {
    try {
      const res = await api.get(`/users/assignable?project_id=${projectId}`);
      const list: User[] = res.data.map((u: any) => ({
        id: u.id,
        name: u.full_name || u.username,
        email: u.email,
        initials: (u.full_name || u.username).substring(0, 2).toUpperCase(),
        avatarColor: '#3b82f6',
        role: 'DEVELOPER_TESTER',
        roles: ['DEVELOPER_TESTER'],
        isSuperuser: false,
      }));
      set({ assignableUsers: list });
      return list;
    } catch (e) {
      return [];
    }
  },

  fetchProvisionedUsers: async (orgId, projectId) => {
    try {
      let url = '/users/provisioned?';
      if (orgId) url += `org_id=${orgId}&`;
      if (projectId) url += `project_id=${projectId}&`;
      const res = await api.get(url);
      const list: User[] = res.data.map((u: any) => ({
        id: u.id,
        name: u.full_name || u.username,
        email: u.email,
        initials: (u.full_name || u.username).substring(0, 2).toUpperCase(),
        avatarColor: '#3b82f6',
        role: u.is_superuser ? 'ADMIN' : (u.roles?.[0] || 'Member'),
        roles: u.roles || [],
        isSuperuser: u.is_superuser || false,
      }));
      return list;
    } catch (e) {
      return [];
    }
  },


  createProject: async (data) => {
    try {
      const payload: Record<string, any> = {
        name: data.name,
        key: data.key.toUpperCase(),
        description: data.description || '',
      };
      // Only include org_id if explicitly provided; backend will auto-resolve otherwise
      if (data.org_id) payload.org_id = data.org_id;

      const res = await api.post('/projects', payload);
      const newProj: Project = {
        id: res.data.id,
        orgId: res.data.org_id,
        name: res.data.name,
        key: res.data.key,
        description: res.data.description,
        createdAt: res.data.created_at,
        updatedAt: res.data.updated_at,
      };

      // Refresh organizations in case a new one was auto-created by the backend
      try {
        const orgRes = await api.get('/organizations');
        const orgs = orgRes.data.map((o: any) => ({ id: o.id, name: o.name, slug: o.slug }));
        set(s => ({ projects: [...s.projects, newProj], organizations: orgs }));
      } catch {
        set(s => ({ projects: [...s.projects, newProj] }));
      }

      await get().switchProject(newProj.id);
      toast.success(`Project "${newProj.name}" created!`);
      return newProj;
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string' ? errorDetail : (errorDetail?.[0]?.msg || 'Failed to create project');
      toast.error(msg);
      throw e;
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      await api.delete(`/projects/${projectId}`);
      const remainingProjects = get().projects.filter(p => p.id !== projectId);
      
      let nextProject = get().currentProject;
      if (get().currentProjectId === projectId) {
        nextProject = remainingProjects[0] || null;
        set({
          projects: remainingProjects,
          currentProjectId: nextProject?.id || null,
          currentProject: nextProject,
        });

        if (nextProject) {
          await get().switchProject(nextProject.id);
        } else {
          set({ issues: [], epics: [], sprints: [], activeSprintId: '' });
        }
      } else {
        set({ projects: remainingProjects });
      }

      toast.success('Project deleted successfully');
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string'
        ? errorDetail
        : (errorDetail?.[0]?.msg || 'Failed to delete project. Requires Admin or Manager permission.');
      toast.error(msg);
      throw e;
    }
  },


  fetchIssueDetail: async (id: string) => {
    try {
      const res = await api.get(`/issues/${id}`);
      const existing = get().issues.find(i => i.id === id);
      const detailed = mapBackendIssue(res.data, existing);

      set(s => ({
        issues: s.issues.map(i => i.id === id ? detailed : i),
        epics: s.epics.map(e => e.id === id ? {
          ...e,
          title: detailed.title,
          description: detailed.description,
          priority: detailed.priority,
        } : e)
      }));

      return detailed;
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string' ? errorDetail : 'Failed to fetch issue details';
      toast.error(msg);
      return null;
    }
  },

  createIssue: async (data) => {
    const projectId = data.projectId || get().currentProjectId;
    if (!projectId) {
      toast.error('No active project selected');
      return null;
    }

    try {
      const backendType = mapUITypeToBackend(data.type);
      let parentId: string | null = null;

      if (data.type === 'story') {
        parentId = data.epicId || data.parentId || null;
      } else if (data.type === 'task' || data.type === 'bug') {
        parentId = data.parentId || null;
      } else if (data.type === 'subtask') {
        parentId = data.parentId || null;
      }

      const payload: any = {
        project_id: projectId,
        issue_type: backendType,
        title: data.title,
        description: data.description || '',
        priority: data.priority ? data.priority.toUpperCase() : 'MEDIUM',
        assignee_id: data.assigneeId || null,
        parent_issue_id: parentId,
        estimate: data.storyPoints ? String(data.storyPoints) : null,
      };

      const res = await api.post('/issues', payload);
      const newIssue = mapBackendIssue(res.data);

      // 1. Initial Status Transition if !== BACKLOG
      if (data.status && data.status !== 'backlog') {
        try {
          const transRes = await api.post(`/issues/${newIssue.id}/transition`, {
            target_status: mapUIStatusToBackend(data.status),
            current_version: newIssue.version,
          });
          const updated = mapBackendIssue(transRes.data, newIssue);
          newIssue.status = updated.status;
          newIssue.version = updated.version;
        } catch (e) {
          // Keep default backlog status if transition rejected
        }
      }

      // 2. Sprint Assignment
      if (data.sprintId) {
        try {
          await api.post(`/sprints/${data.sprintId}/issues`, { issue_id: newIssue.id });
          newIssue.sprintId = data.sprintId;
        } catch (e) {}
      }

      // Update Store state
      if (newIssue.type === 'epic') {
        const newEpic: Epic = {
          id: newIssue.id,
          key: newIssue.key,
          title: newIssue.title,
          description: newIssue.description,
          status: 'in-progress',
          priority: newIssue.priority,
          ownerId: newIssue.assigneeId || newIssue.reporterId,
          color: '#6366f1',
          createdAt: newIssue.createdAt,
        };
        set(s => ({ epics: [...s.epics, newEpic], issues: [...s.issues, newIssue] }));
      } else {
        set(s => ({ issues: [...s.issues, newIssue] }));
      }

      const typeLabel = data.type === 'story' ? 'User Story' : (data.type === 'epic' ? 'Epic' : data.type);
      const isRealKey = newIssue.key && !isUuidOrHash(newIssue.key);
      const nameOrKey = isRealKey ? newIssue.key : `"${newIssue.title}"`;
      toast.success(`Created ${typeLabel} ${nameOrKey}`);

      // Refetch project data to ensure hierarchy links are fresh
      await get().switchProject(projectId);

      if (parentId) {
        await get().fetchIssueDetail(parentId);
      }

      return newIssue;
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string'
        ? errorDetail
        : (errorDetail?.msg || errorDetail?.[0]?.msg || 'Failed to create issue');
      toast.error(msg);
      throw e;
    }
  },

  updateIssue: async (id, data) => {
    const existing = get().issues.find(i => i.id === id) || get().epics.find(e => e.id === id);
    if (!existing) return;

    const currentVersion = (existing as any).version || 1;

    const payload: any = {
      version: currentVersion,
      title: data.title,
      description: data.description,
      priority: data.priority ? data.priority.toUpperCase() : undefined,
      estimate: data.storyPoints !== undefined ? (data.storyPoints !== null ? String(data.storyPoints) : null) : undefined,
      assignee_id: data.assigneeId !== undefined ? data.assigneeId : undefined,
      due_date: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate).toISOString() : null) : undefined,
      position: data.order,
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    try {
      const res = await api.put(`/issues/${id}`, payload);
      const updated = mapBackendIssue(res.data, existing as any);

      if (updated.type === 'epic') {
        set(s => ({
          epics: s.epics.map(e => e.id === id ? {
            ...e,
            title: updated.title,
            description: updated.description,
            priority: updated.priority,
          } : e),
          issues: s.issues.map(i => i.id === id ? updated : i)
        }));
      } else {
        set(s => ({ issues: s.issues.map(i => i.id === id ? updated : i) }));
      }

      if (data.sprintId !== undefined && data.sprintId !== (existing as any).sprintId) {
        if (data.sprintId) {
          await get().assignIssueToSprint(data.sprintId, id);
        }
      }

      toast.success('Updated issue successfully');
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string'
        ? errorDetail
        : (errorDetail?.msg || errorDetail?.[0]?.msg || 'Failed to update issue');
      toast.error(msg);
      await get().switchProject(get().currentProjectId!);
    }
  },

  moveIssue: async (id, status, targetSprintId) => {
    const issue = get().issues.find(i => i.id === id);
    if (!issue) return false;

    const previousStatus = issue.status;
    const previousSprintId = issue.sprintId;

    // Optimistic local update
    set(s => ({
      issues: s.issues.map(i => i.id === id ? { ...i, status, sprintId: targetSprintId ?? i.sprintId } : i)
    }));

    try {
      const res = await api.post(`/issues/${id}/transition`, {
        target_status: mapUIStatusToBackend(status),
        current_version: issue.version || 1
      });
      const updated = mapBackendIssue(res.data, issue);

      set(s => ({ issues: s.issues.map(i => i.id === id ? updated : i) }));

      if (targetSprintId && targetSprintId !== previousSprintId) {
        await get().assignIssueToSprint(targetSprintId, id);
      }

      // Refetch project to update linked story/task status counters
      if (get().currentProjectId) {
        await get().switchProject(get().currentProjectId!);
      }

      const isRealKey = issue.key && !isUuidOrHash(issue.key);
      const nameOrKey = isRealKey ? issue.key : `"${issue.title}"`;
      toast.success(`Moved ${nameOrKey} to ${status.replace('-', ' ')}`);
      return true;
    } catch (e: any) {
      // Revert local state
      set(s => ({
        issues: s.issues.map(i => i.id === id ? { ...i, status: previousStatus, sprintId: previousSprintId } : i)
      }));

      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string'
        ? errorDetail
        : (errorDetail?.msg || errorDetail?.[0]?.msg || 'Workflow transition rejected');

      toast.error(`Transition rejected: ${msg}`);
      return false;
    }
  },

  assignIssueToSprint: async (sprintId, issueId) => {
    try {
      await api.post(`/sprints/${sprintId}/issues`, { issue_id: issueId });
      set(s => ({
        issues: s.issues.map(i => i.id === issueId ? { ...i, sprintId } : i)
      }));
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string' ? errorDetail : 'Failed to assign issue to sprint';
      toast.error(msg);
    }
  },

  deleteIssue: async (id) => {
    try {
      await api.delete(`/issues/${id}`);
      toast.success('Issue deleted');
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string' ? errorDetail : 'Failed to delete issue';
      toast.error(msg);
      throw e;
    }
    set(s => ({
      issues: s.issues.filter(i => i.id !== id),
      epics: s.epics.filter(e => e.id !== id),
    }));
  },

  duplicateIssue: async (id) => {
    const issue = get().issues.find(i => i.id === id);
    if (issue) {
      await get().createIssue({
        type: issue.type,
        title: `${issue.title} (Copy)`,
        description: issue.description,
        priority: issue.priority,
        epicId: issue.epicId,
        parentId: issue.parentId,
        storyPoints: issue.storyPoints,
        sprintId: issue.sprintId,
      });
    }
  },

  bulkUpdateIssues: async (ids, data) => {
    for (const id of ids) {
      if (data.status) {
        await get().moveIssue(id, data.status);
      } else {
        await get().updateIssue(id, data);
      }
    }
  },

  createEpic: async (data) => {
    await get().createIssue({
      type: 'epic',
      title: data.title || 'New Epic',
      description: data.description,
      priority: data.priority,
    });
  },

  deleteEpic: async (id) => {
    await get().deleteIssue(id);
  },

  createSprint: async (data) => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;
    try {
      const res = await api.post('/sprints', {
        project_id: currentProjectId,
        name: data.name,
        goal: data.goal || '',
        start_date: data.startDate || new Date().toISOString(),
        due_date: data.endDate || new Date(Date.now() + 14 * 86400000).toISOString()
      });
      const newSprint: Sprint = {
        id: res.data.id,
        name: res.data.name,
        goal: res.data.goal,
        startDate: res.data.start_date,
        endDate: res.data.due_date,
        status: res.data.status?.toLowerCase() || 'planned',
      };
      set(s => ({ sprints: [...s.sprints, newSprint] }));
      toast.success(`Sprint "${newSprint.name}" created`);
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string' ? errorDetail : 'Failed to create sprint';
      toast.error(msg);
    }
  },

  addComment: async (issueId, body) => {
    try {
      const res = await api.post(`/issues/${issueId}/comments`, { content: body });
      const newComment: Comment = {
        id: res.data.id,
        issueId: res.data.issue_id,
        authorId: res.data.author_id,
        body: res.data.content,
        createdAt: res.data.created_at,
        updatedAt: res.data.updated_at,
        authorName: res.data.author?.full_name || res.data.author?.username || 'You',
        authorInitials: (res.data.author?.full_name || res.data.author?.username || 'U').substring(0, 2).toUpperCase(),
      };

      set(s => ({
        issues: s.issues.map(i => i.id === issueId ? {
          ...i,
          comments: [...(i.comments || []).filter(c => c.id !== newComment.id), newComment],
          commentCount: ((i.comments || []).length) + 1,
        } : i)
      }));

      await get().fetchIssueDetail(issueId);
      toast.success('Comment added');
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string' ? errorDetail : 'Failed to add comment';
      toast.error(msg);
    }
  },

  addAcceptanceCriterion: async (issueId, text) => {
    try {
      const res = await api.post(`/issues/${issueId}/acceptance-criteria`, {
        description: text,
        text: text,
        position: 0,
      });

      const newAC: AcceptanceCriterion = {
        id: res.data.id,
        issueId: res.data.story_id || issueId,
        text: res.data.description || res.data.text || text,
        completed: !!res.data.is_completed,
      };

      set(s => ({
        issues: s.issues.map(i => i.id === issueId ? {
          ...i,
          acceptanceCriteria: [...(i.acceptanceCriteria || []).filter(a => a.id !== newAC.id), newAC]
        } : i)
      }));

      await get().fetchIssueDetail(issueId);
      toast.success('Acceptance criterion added');
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string'
        ? errorDetail
        : (errorDetail?.msg || errorDetail?.[0]?.msg || 'Failed to add acceptance criterion');
      toast.error(msg);
    }
  },

  toggleAcceptanceCriterion: async (id) => {
    const targetAC = get().issues.flatMap(i => i.acceptanceCriteria || []).find(a => a.id === id);
    const newCompleted = targetAC ? !targetAC.completed : true;

    // Optimistic toggle in store
    set(s => ({
      issues: s.issues.map(i => ({
        ...i,
        acceptanceCriteria: (i.acceptanceCriteria || []).map(ac => ac.id === id ? { ...ac, completed: newCompleted } : ac)
      }))
    }));

    try {
      const res = await api.patch(`/acceptance-criteria/${id}`, { is_completed: newCompleted });
      if (res.data?.story_id) {
        await get().fetchIssueDetail(res.data.story_id);
      }
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail;
      const msg = typeof errorDetail === 'string' ? errorDetail : 'Failed to toggle acceptance criterion';
      toast.error(msg);
    }
  },

  markAllNotificationsRead: () => set({ notifications: [] }),
  
  toggleTheme: () => set(s => {
    const next = s.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    return { theme: next };
  }),
  
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveSprintId: (id) => set({ activeSprintId: id }),
}));
