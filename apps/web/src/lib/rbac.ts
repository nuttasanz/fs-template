import type { UserRole } from '@repo/schemas';

const ROLE_WEIGHT: Record<UserRole, number> = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/**
 * Returns true if actor is permitted to edit or delete the target user.
 * Mirrors the backend enforceRbac logic exactly:
 * deny if actor is not SUPER_ADMIN and targetRole >= actorRole.
 */
export function canActorManageTarget(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SUPER_ADMIN') return true;
  return ROLE_WEIGHT[targetRole] < ROLE_WEIGHT[actorRole];
}

/**
 * Returns the subset of roles that actor is permitted to assign.
 * An actor can only assign roles with weight strictly less than their own.
 */
export function assignableRoles(actorRole: UserRole): UserRole[] {
  return (['USER', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).filter(
    (role) => ROLE_WEIGHT[role] < ROLE_WEIGHT[actorRole],
  );
}
