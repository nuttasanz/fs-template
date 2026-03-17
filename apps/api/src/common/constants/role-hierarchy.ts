import type { UserRole } from '@repo/schemas';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};
