import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole } from '@repo/schemas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(
  user: { role: UserRole } | null,
  requiredRoles: UserRole[] | null,
): ExecutionContext {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key) => (key === ROLES_KEY ? requiredRoles : null));

  const guard = new RbacGuard(reflector);

  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ sessionUser: user ?? undefined }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { guard, ctx } as unknown as ExecutionContext;
}

function run(user: { role: UserRole } | null, requiredRoles: UserRole[] | null): boolean {
  const { guard, ctx } = makeContext(user, requiredRoles) as unknown as {
    guard: RbacGuard;
    ctx: ExecutionContext;
  };
  return guard.canActivate(ctx);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RbacGuard', () => {
  it('returns true when no @Roles() metadata is present (public route)', () => {
    expect(run({ role: 'USER' }, null)).toBe(true);
  });

  it('returns true when the user role meets the minimum required role', () => {
    expect(run({ role: 'ADMIN' }, ['ADMIN'])).toBe(true);
    expect(run({ role: 'SUPER_ADMIN' }, ['ADMIN'])).toBe(true);
    expect(run({ role: 'SUPER_ADMIN' }, ['SUPER_ADMIN'])).toBe(true);
  });

  it('throws ForbiddenException when the user role is below the required minimum', () => {
    expect(() => run({ role: 'USER' }, ['ADMIN'])).toThrow(ForbiddenException);
    expect(() => run({ role: 'ADMIN' }, ['SUPER_ADMIN'])).toThrow(ForbiddenException);
  });

  it('throws UnauthorizedException when sessionUser is not set', () => {
    expect(() => run(null, ['ADMIN'])).toThrow(UnauthorizedException);
  });
});
