import { ROLE_HIERARCHY, type UserRole } from './user.schema';

/**
 * Returns true if `actorRole` is allowed to manage a user with `targetRole`.
 * SUPER_ADMIN can manage anyone. Others can only manage lower roles.
 * Single source of truth — used by both backend and frontend.
 */
export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SUPER_ADMIN') return true;
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}
