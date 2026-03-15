import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@repo/schemas';

export const ROLES_KEY = 'roles';

/**
 * Attach one or more required roles to a route handler.
 * The RbacGuard reads this metadata to enforce the role hierarchy.
 *
 * @example @Roles('ADMIN')           // ADMIN or SUPER_ADMIN may access
 * @example @Roles('SUPER_ADMIN')     // only SUPER_ADMIN may access
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
