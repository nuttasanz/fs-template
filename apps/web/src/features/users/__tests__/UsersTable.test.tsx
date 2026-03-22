import { describe, it, expect } from 'vitest';
import { canManageRole, type UserRole } from '@repo/schemas';
import type { UserDTO } from '@repo/schemas';

// ---------------------------------------------------------------------------
// canManageRole — shared RBAC utility
// ---------------------------------------------------------------------------

describe('canManageRole', () => {
  it('SUPER_ADMIN can manage SUPER_ADMIN', () => {
    expect(canManageRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
  });

  it('SUPER_ADMIN can manage ADMIN', () => {
    expect(canManageRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
  });

  it('SUPER_ADMIN can manage USER', () => {
    expect(canManageRole('SUPER_ADMIN', 'USER')).toBe(true);
  });

  it('ADMIN can manage USER', () => {
    expect(canManageRole('ADMIN', 'USER')).toBe(true);
  });

  it('ADMIN cannot manage ADMIN', () => {
    expect(canManageRole('ADMIN', 'ADMIN')).toBe(false);
  });

  it('ADMIN cannot manage SUPER_ADMIN', () => {
    expect(canManageRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
  });

  it('USER cannot manage USER', () => {
    expect(canManageRole('USER', 'USER')).toBe(false);
  });

  it('USER cannot manage ADMIN', () => {
    expect(canManageRole('USER', 'ADMIN')).toBe(false);
  });

  it('USER cannot manage SUPER_ADMIN', () => {
    expect(canManageRole('USER', 'SUPER_ADMIN')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canModify — component-level wrapper used by UsersTable
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    id: 'u1',
    email: 'test@test.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    profile: { firstName: 'Test', lastName: 'User', bio: null },
    ...overrides,
  };
}

// Mirrors the canModify function in UsersTable.tsx
function canModify(actor: UserDTO, target: UserDTO): boolean {
  if (!actor?.role || !target?.role) return false;
  return canManageRole(actor.role, target.role);
}

describe('canModify', () => {
  it('returns false when actor has no role', () => {
    const actor = makeUser({ role: undefined as unknown as UserRole });
    const target = makeUser();
    expect(canModify(actor, target)).toBe(false);
  });

  it('returns false when target has no role', () => {
    const actor = makeUser({ role: 'SUPER_ADMIN' });
    const target = makeUser({ role: undefined as unknown as UserRole });
    expect(canModify(actor, target)).toBe(false);
  });

  it('SUPER_ADMIN can modify another SUPER_ADMIN', () => {
    const actor = makeUser({ id: 'a1', role: 'SUPER_ADMIN' });
    const target = makeUser({ id: 'a2', role: 'SUPER_ADMIN' });
    expect(canModify(actor, target)).toBe(true);
  });

  it('SUPER_ADMIN can modify ADMIN', () => {
    const actor = makeUser({ role: 'SUPER_ADMIN' });
    const target = makeUser({ role: 'ADMIN' });
    expect(canModify(actor, target)).toBe(true);
  });

  it('ADMIN can modify USER', () => {
    const actor = makeUser({ role: 'ADMIN' });
    const target = makeUser({ role: 'USER' });
    expect(canModify(actor, target)).toBe(true);
  });

  it('ADMIN cannot modify another ADMIN', () => {
    const actor = makeUser({ id: 'a1', role: 'ADMIN' });
    const target = makeUser({ id: 'a2', role: 'ADMIN' });
    expect(canModify(actor, target)).toBe(false);
  });

  it('ADMIN cannot modify SUPER_ADMIN', () => {
    const actor = makeUser({ role: 'ADMIN' });
    const target = makeUser({ role: 'SUPER_ADMIN' });
    expect(canModify(actor, target)).toBe(false);
  });

  it('USER cannot modify anyone', () => {
    const actor = makeUser({ role: 'USER' });
    const target = makeUser({ role: 'USER' });
    expect(canModify(actor, target)).toBe(false);
  });
});
