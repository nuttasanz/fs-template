import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository, type UserRow } from './users.repository';
import type { SessionUser } from '../common/types/session.types';
import type { UserDTO } from '@repo/schemas';

const mockConfig = { USERS_PAGE_LIMIT: 20, USERS_PAGE_LIMIT_MAX: 100 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUPER_ADMIN_ACTOR: SessionUser = {
  id: 'actor',
  email: 'admin@test.com',
  role: 'SUPER_ADMIN',
};
const ADMIN_ACTOR: SessionUser = { id: 'actor', email: 'admin@test.com', role: 'ADMIN' };

function makeUserRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'u1',
    email: 'user@test.com',
    role: 'USER' as const,
    status: 'ACTIVE' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    firstName: 'Alice',
    lastName: 'Smith',
    bio: null,
    ...overrides,
  };
}

function makeUserDTO(overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    id: 'u1',
    email: 'user@test.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    profile: { firstName: 'Alice', lastName: 'Smith', bio: null },
    ...overrides,
  };
}

function makeMockRepo(): jest.Mocked<UsersRepository> {
  return {
    countUsers: jest.fn(),
    countActiveSessions: jest.fn(),
    findById: jest.fn(),
    findPaginated: jest.fn(),
    createWithProfile: jest.fn(),
    updateWithProfile: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
}

// ---------------------------------------------------------------------------
// RBAC enforcement (private method — direct unit tests)
// ---------------------------------------------------------------------------

describe('UsersService — RBAC enforcement', () => {
  // Instantiate with a minimal mock; enforceRbac has no DB dependency.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new UsersService(makeMockRepo(), mockConfig as any);

  const enforce = (actorRole: string, targetRole: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).enforceRbac(actorRole, targetRole);

  it('ADMIN cannot manage another ADMIN', () => {
    expect(() => enforce('ADMIN', 'ADMIN')).toThrow(ForbiddenException);
  });

  it('ADMIN cannot manage SUPER_ADMIN', () => {
    expect(() => enforce('ADMIN', 'SUPER_ADMIN')).toThrow(ForbiddenException);
  });

  it('ADMIN can manage USER', () => {
    expect(() => enforce('ADMIN', 'USER')).not.toThrow();
  });

  it('SUPER_ADMIN can manage ADMIN', () => {
    expect(() => enforce('SUPER_ADMIN', 'ADMIN')).not.toThrow();
  });

  it('SUPER_ADMIN can manage SUPER_ADMIN', () => {
    expect(() => enforce('SUPER_ADMIN', 'SUPER_ADMIN')).not.toThrow();
  });

  it('USER cannot manage another USER', () => {
    expect(() => enforce('USER', 'USER')).toThrow(ForbiddenException);
  });

  it('USER cannot manage ADMIN', () => {
    expect(() => enforce('USER', 'ADMIN')).toThrow(ForbiddenException);
  });

  it('USER cannot manage SUPER_ADMIN', () => {
    expect(() => enforce('USER', 'SUPER_ADMIN')).toThrow(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe('UsersService — findAll', () => {
  it('returns offset-paginated results with correct meta shape', async () => {
    const repo = makeMockRepo();
    repo.findPaginated.mockResolvedValue({ rows: [makeUserRow()], totalItems: 1 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.totalItems).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.data[0]).toMatchObject({ id: 'u1', email: 'user@test.com' });
  });

  it('returns correct totalPages for multiple pages', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => makeUserRow({ id: `u${i + 1}` }));
    const repo = makeMockRepo();
    repo.findPaginated.mockResolvedValue({ rows, totalItems: 25 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.totalItems).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('clamps pageSize to USERS_PAGE_LIMIT_MAX', async () => {
    const repo = makeMockRepo();
    repo.findPaginated.mockResolvedValue({ rows: [], totalItems: 0 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 999 });

    expect(result.pageSize).toBe(100);
  });

  it('defaults page to 1 when not provided', async () => {
    const repo = makeMockRepo();
    repo.findPaginated.mockResolvedValue({ rows: [], totalItems: 0 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await service.findAll({ pageSize: 10 } as any);

    expect(result.currentPage).toBe(1);
  });

  it.each([0, -1, -99])('clamps page to 1 when page is %i', async (page) => {
    const repo = makeMockRepo();
    repo.findPaginated.mockResolvedValue({ rows: [], totalItems: 0 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.findAll({ page, pageSize: 10 });

    expect(result.currentPage).toBe(1);
  });

  it('returns results when search term matches', async () => {
    const repo = makeMockRepo();
    repo.findPaginated.mockResolvedValue({ rows: [makeUserRow()], totalItems: 1 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 10, search: 'John' });

    expect(result.data).toHaveLength(1);
    expect(result.totalItems).toBe(1);
  });

  it('ignores empty or whitespace-only search', async () => {
    const repo = makeMockRepo();
    repo.findPaginated.mockResolvedValue({ rows: [], totalItems: 0 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 10, search: '' });

    expect(result.data).toHaveLength(0);
    expect(repo.findPaginated).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// findOne
// ---------------------------------------------------------------------------

describe('UsersService — findOne', () => {
  it('returns a UserDTO when the user exists', async () => {
    const repo = makeMockRepo();
    repo.findById.mockResolvedValue(makeUserRow());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.findOne('u1');

    expect(result).toMatchObject({ id: 'u1', profile: { firstName: 'Alice' } });
  });

  it('throws NotFoundException when the user does not exist', async () => {
    const repo = makeMockRepo();
    repo.findById.mockResolvedValue(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('UsersService — create', () => {
  it('creates a user and profile via repository and returns UserDTO', async () => {
    const repo = makeMockRepo();
    repo.createWithProfile.mockResolvedValue(makeUserRow({ email: 'new@test.com' }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const dto = {
      email: 'new@test.com',
      password: 'pw',
      role: 'USER' as const,
      firstName: 'Bob',
      lastName: 'Jones',
    };
    const result = await service.create(dto, SUPER_ADMIN_ACTOR);

    expect(result).toMatchObject({ id: 'u1', email: 'new@test.com' });
    expect(repo.createWithProfile).toHaveBeenCalled();
  });

  it('throws ConflictException when the email already exists (pg 23505)', async () => {
    const pgError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const repo = makeMockRepo();
    repo.createWithProfile.mockRejectedValue(pgError);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const dto = {
      email: 'dup@test.com',
      password: 'pw',
      role: 'USER' as const,
      firstName: 'X',
      lastName: 'Y',
    };
    await expect(service.create(dto, SUPER_ADMIN_ACTOR)).rejects.toThrow(ConflictException);
  });

  it('throws ForbiddenException when the actor lacks sufficient role to assign the target role', async () => {
    const repo = makeMockRepo();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const dto = {
      email: 'x@test.com',
      password: 'pw',
      role: 'ADMIN' as const,
      firstName: 'X',
      lastName: 'Y',
    };
    // ADMIN actor cannot create another ADMIN
    await expect(service.create(dto, ADMIN_ACTOR)).rejects.toThrow(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe('UsersService — update', () => {
  it('runs the update via repository and returns the refreshed UserDTO', async () => {
    const targetUser = makeUserDTO();
    const repo = makeMockRepo();
    repo.updateWithProfile.mockResolvedValue(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(targetUser);

    const result = await service.update('u1', { firstName: 'Bob' }, SUPER_ADMIN_ACTOR);

    expect(repo.updateWithProfile).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'u1' });
  });
});

// ---------------------------------------------------------------------------
// remove (soft delete)
// ---------------------------------------------------------------------------

describe('UsersService — remove', () => {
  it('soft-deletes the user via repository', async () => {
    const targetUser = makeUserDTO();
    const repo = makeMockRepo();
    repo.softDelete.mockResolvedValue(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(targetUser);

    await service.remove('u1', SUPER_ADMIN_ACTOR);

    expect(repo.softDelete).toHaveBeenCalledWith('u1');
  });

  it('throws ForbiddenException when attempting to delete own account', async () => {
    const repo = makeMockRepo();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    await expect(service.remove('actor', SUPER_ADMIN_ACTOR)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the actor lacks permission to remove the target', async () => {
    const targetUser = makeUserDTO({ role: 'ADMIN' });
    const repo = makeMockRepo();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(targetUser);

    // ADMIN actor cannot remove another ADMIN
    await expect(service.remove('u1', ADMIN_ACTOR)).rejects.toThrow(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

describe('UsersService — getStats', () => {
  it('returns totalUsers and activeSessions counts', async () => {
    const repo = makeMockRepo();
    repo.countUsers.mockResolvedValue(42);
    repo.countActiveSessions.mockResolvedValue(7);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.getStats();

    expect(result).toEqual({ totalUsers: 42, activeSessions: 7 });
  });

  it('returns 0 when no records exist', async () => {
    const repo = makeMockRepo();
    repo.countUsers.mockResolvedValue(0);
    repo.countActiveSessions.mockResolvedValue(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    const result = await service.getStats();

    expect(result).toEqual({ totalUsers: 0, activeSessions: 0 });
  });
});

// ---------------------------------------------------------------------------
// update — RBAC on role change
// ---------------------------------------------------------------------------

describe('UsersService — update (role change RBAC)', () => {
  it('allows SUPER_ADMIN to change a USER role to ADMIN', async () => {
    const targetUser = makeUserDTO({ role: 'USER' });
    const repo = makeMockRepo();
    repo.updateWithProfile.mockResolvedValue(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(targetUser);

    const result = await service.update('u1', { role: 'ADMIN' }, SUPER_ADMIN_ACTOR);

    expect(repo.updateWithProfile).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'u1' });
  });

  it('throws ForbiddenException when ADMIN tries to change target role to ADMIN', async () => {
    const repo = makeMockRepo();
    // The validate callback inside updateWithProfile should throw
    repo.updateWithProfile.mockImplementation(async (_id, _uf, _pf, validate) => {
      validate('USER' as const); // target is USER, but assigning ADMIN role
      return true;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);

    // ADMIN cannot assign ADMIN role
    await expect(service.update('u1', { role: 'ADMIN' }, ADMIN_ACTOR)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when ADMIN tries to update an ADMIN user', async () => {
    const repo = makeMockRepo();
    // The validate callback inside updateWithProfile should throw
    repo.updateWithProfile.mockImplementation(async (_id, _uf, _pf, validate) => {
      validate('ADMIN' as const); // target is ADMIN — ADMIN can't manage ADMIN
      return true;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(repo, mockConfig as any);

    // ADMIN cannot manage another ADMIN (enforceRbac on target role)
    await expect(service.update('u1', { firstName: 'Changed' }, ADMIN_ACTOR)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
