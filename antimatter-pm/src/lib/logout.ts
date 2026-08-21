import { api } from './api';
import { useStore } from '../store';

/** End the server session and remove the authenticated client state. */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Log error but proceed with client-side cleanup
    console.error('Logout request failed:', error);
  } finally {
    localStorage.removeItem('csrf_token');
    delete api.defaults.headers.common['X-CSRF-Token'];
    useStore.setState({
      currentUserId: '',
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
      activeSprintId: '',
    });
  }
}

