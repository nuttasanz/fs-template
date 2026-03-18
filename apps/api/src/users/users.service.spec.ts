import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { SessionUser } from '../common/types/session.types';
import type { UserDTO } from '@repo/schemas';

const mockConfig = { USERS_PAGE_LIMIT: 20, USERS_PAGE_LIMIT_MAX: 100 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUPER_ADMIN_ACTOR: SessionUser = { id: 'actor', email: 'admin@test.com', role: 'SUPER_ADMIN' };
const ADMIN_ACTOR: SessionUser = { id: 'actor', email: 'admin@test.com', role: 'ADMIN' };

function makeUserRow(overrides: Record<string, unknown> = {}) {
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

// ---------------------------------------------------------------------------
// RBAC enforcement (private method — direct unit tests)
// ---------------------------------------------------------------------------

describe('UsersService — RBAC enforcement', () => {
  // Instantiate with a minimal mock; enforceRbac has no DB dependency.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new UsersService({} as any, mockConfig as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enforce = (actorRole: string, targetRole: string) => (service as any).enforceRbac(actorRole, targetRole);

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
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe('UsersService — findAll', () => {
  it('returns cursor-paginated results with correct shape and null nextCursor when no more pages', async () => {
    const userRow = makeUserRow();

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                // Returns 1 row; limit+1=21, so hasMore=false → nextCursor=null
                limit: jest.fn().mockResolvedValue([userRow]),
              }),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const result = await service.findAll({});

    expect(result.data).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
    expect(result.limit).toBe(20);
    expect(result.data[0]).toMatchObject({ id: 'u1', email: 'user@test.com' });
  });

  it('returns a non-null nextCursor when there are more pages', async () => {
    // Build limit+1 = 21 rows to trigger hasMore=true
    const rows = Array.from({ length: 21 }, (_, i) =>
      makeUserRow({ id: `u${i + 1}`, createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`) }),
    );

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(rows),
              }),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const result = await service.findAll({});

    expect(result.data).toHaveLength(20); // 21st row sliced off
    expect(result.nextCursor).not.toBeNull();

    // Cursor must decode to a valid { createdAt, id } object
    const decoded = JSON.parse(
      Buffer.from(result.nextCursor!, 'base64url').toString('utf-8'),
    ) as { createdAt: string; id: string };
    expect(decoded.id).toBe('u20');
    expect(new Date(decoded.createdAt).getTime()).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// findOne
// ---------------------------------------------------------------------------

describe('UsersService — findOne', () => {
  it('returns a UserDTO when the user exists', async () => {
    const row = makeUserRow();
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([row]),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const result = await service.findOne('u1');

    expect(result).toMatchObject({ id: 'u1', profile: { firstName: 'Alice' } });
  });

  it('throws NotFoundException when the user does not exist', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('UsersService — create', () => {
  it('creates a user and profile inside a transaction and returns UserDTO', async () => {
    const insertedUser = {
      id: 'u1',
      email: 'new@test.com',
      role: 'USER' as const,
      status: 'ACTIVE' as const,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
    const insertedProfile = { userId: 'u1', firstName: 'Bob', lastName: 'Jones', bio: null };

    const txInsert = jest
      .fn()
      .mockReturnValueOnce({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([insertedUser]) }) })
      .mockReturnValueOnce({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([insertedProfile]) }) });

    const db = {
      // email uniqueness check — no existing user
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction: jest.fn().mockImplementation((cb: (tx: any) => Promise<unknown>) => cb({ insert: txInsert })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const dto = { email: 'new@test.com', password: 'pw', role: 'USER' as const, firstName: 'Bob', lastName: 'Jones' };
    const result = await service.create(dto, SUPER_ADMIN_ACTOR);

    expect(result).toMatchObject({ id: 'u1', email: 'new@test.com' });
    expect(db.transaction).toHaveBeenCalled();
  });

  it('throws ConflictException when the email already exists', async () => {
    const existing = { id: 'existing' };

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existing]),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const dto = { email: 'dup@test.com', password: 'pw', role: 'USER' as const, firstName: 'X', lastName: 'Y' };
    await expect(service.create(dto, SUPER_ADMIN_ACTOR)).rejects.toThrow(ConflictException);
  });

  it('throws ForbiddenException when the actor lacks sufficient role to assign the target role', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService({} as any, mockConfig as any);
    const dto = { email: 'x@test.com', password: 'pw', role: 'ADMIN' as const, firstName: 'X', lastName: 'Y' };
    // ADMIN actor cannot create another ADMIN
    await expect(service.create(dto, ADMIN_ACTOR)).rejects.toThrow(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe('UsersService — update', () => {
  it('runs the update inside a transaction and returns the refreshed UserDTO', async () => {
    const targetUser = makeUserDTO();
    const txWhere = jest.fn().mockResolvedValue(undefined);
    const txSet = jest.fn().mockReturnValue({ where: txWhere });
    const txUpdate = jest.fn().mockReturnValue({ set: txSet });

    const db = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction: jest.fn().mockImplementation((cb: (tx: any) => Promise<unknown>) => cb({ update: txUpdate })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(targetUser);

    const result = await service.update('u1', { firstName: 'Bob' }, SUPER_ADMIN_ACTOR);

    expect(db.transaction).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'u1' });
  });
});

// ---------------------------------------------------------------------------
// remove (soft delete)
// ---------------------------------------------------------------------------

describe('UsersService — remove', () => {
  it('soft-deletes the user by setting deletedAt (row is not physically removed)', async () => {
    const targetUser = makeUserDTO();
    const dbUpdateWhere = jest.fn().mockResolvedValue(undefined);
    const dbUpdateSet = jest.fn().mockReturnValue({ where: dbUpdateWhere });
    const db = {
      update: jest.fn().mockReturnValue({ set: dbUpdateSet }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(targetUser);

    await service.remove('u1', SUPER_ADMIN_ACTOR);

    // Verify update was called (soft delete path)
    expect(db.update).toHaveBeenCalled();
    const setArg = dbUpdateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg['deletedAt']).toBeInstanceOf(Date);
  });

  it('throws ForbiddenException when the actor lacks permission to remove the target', async () => {
    const targetUser = makeUserDTO({ role: 'ADMIN' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService({} as any, mockConfig as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(targetUser);

    // ADMIN actor cannot remove another ADMIN
    await expect(service.remove('u1', ADMIN_ACTOR)).rejects.toThrow(ForbiddenException);
  });
});
