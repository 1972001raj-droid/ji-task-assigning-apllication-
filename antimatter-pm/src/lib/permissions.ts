import type { User } from '../types';

/**
 * Check if a user is authorized to delete a project.
 * Authorized roles: ADMIN, MANAGER, or Superuser.
 */
export function canDeleteProject(user?: User | null): boolean {
  if (!user) return false;
  if (user.isSuperuser) return true;

  const mainRole = user.role?.toUpperCase() || '';
  if (mainRole.includes('ADMIN') || mainRole.includes('MANAGER')) {
    return true;
  }

  if (Array.isArray(user.roles)) {
    return user.roles.some((r) => {
      const upper = r.toUpperCase();
      return upper.includes('ADMIN') || upper.includes('MANAGER');
    });
  }

  return false;
}
