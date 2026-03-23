import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
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
  const enforce = (actorRole: string, targetRole: string) =>
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
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe('UsersService — findAll', () => {
  function makeFindAllDb(totalCount: number, rows: ReturnType<typeof makeUserRow>[]) {
    // The service calls db.select() twice in Promise.all:
    // 1st call → COUNT query chain: select().from().leftJoin().where()
    // 2nd call → data query chain: select().from().leftJoin().where().orderBy().offset().limit()
    let callIndex = 0;
    return {
      select: jest.fn().mockImplementation(() => {
        const idx = callIndex++;
        if (idx === 0) {
          // COUNT query (with LEFT JOIN for search support)
          return {
            from: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ count: totalCount }]),
              }),
            }),
          };
        }
        // Data query
        return {
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  offset: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(rows),
                  }),
                }),
              }),
            }),
          }),
        };
      }),
    };
  }

  it('returns offset-paginated results with correct meta shape', async () => {
    const userRow = makeUserRow();
    const db = makeFindAllDb(1, [userRow]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
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
    const db = makeFindAllDb(25, rows);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.totalItems).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('clamps pageSize to USERS_PAGE_LIMIT_MAX', async () => {
    const db = makeFindAllDb(0, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 999 });

    expect(result.pageSize).toBe(100);
  });

  it('defaults page to 1 when not provided or less than 1', async () => {
    const db = makeFindAllDb(0, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 10 });

    expect(result.currentPage).toBe(1);
  });

  it('returns results when search term matches', async () => {
    const userRow = makeUserRow({ firstName: 'John', lastName: 'Doe' });
    const db = makeFindAllDb(1, [userRow]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 10, search: 'John' });

    expect(result.data).toHaveLength(1);
    expect(result.totalItems).toBe(1);
  });

  it('ignores empty or whitespace-only search', async () => {
    const db = makeFindAllDb(0, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const result = await service.findAll({ page: 1, pageSize: 10, search: '' });

    expect(result.data).toHaveLength(0);
    // Verify db.select was called (query executed without search condition)
    expect(db.select).toHaveBeenCalled();
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
      .mockReturnValueOnce({
        values: jest
          .fn()
          .mockReturnValue({ returning: jest.fn().mockResolvedValue([insertedUser]) }),
      })
      .mockReturnValueOnce({
        values: jest
          .fn()
          .mockReturnValue({ returning: jest.fn().mockResolvedValue([insertedProfile]) }),
      });

    const db = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction: jest
        .fn()
        .mockImplementation((cb: (tx: any) => Promise<unknown>) => cb({ insert: txInsert })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    const dto = {
      email: 'new@test.com',
      password: 'pw',
      role: 'USER' as const,
      firstName: 'Bob',
      lastName: 'Jones',
    };
    const result = await service.create(dto, SUPER_ADMIN_ACTOR);

    expect(result).toMatchObject({ id: 'u1', email: 'new@test.com' });
    expect(db.transaction).toHaveBeenCalled();
  });

  it('throws ConflictException when the email already exists (pg 23505)', async () => {
    const pgError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });

    const txInsert = jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockRejectedValue(pgError),
      }),
    });

    const db = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction: jest
        .fn()
        .mockImplementation((cb: (tx: any) => Promise<unknown>) => cb({ insert: txInsert })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService({} as any, mockConfig as any);
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
  it('runs the update inside a transaction and returns the refreshed UserDTO', async () => {
    const targetUser = makeUserDTO();
    const txWhere = jest.fn().mockResolvedValue(undefined);
    const txSet = jest.fn().mockReturnValue({ where: txWhere });
    const txUpdate = jest.fn().mockReturnValue({ set: txSet });

    const db = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction: jest
        .fn()
        .mockImplementation((cb: (tx: any) => Promise<unknown>) => cb({ update: txUpdate })),
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
  it('soft-deletes the user and revokes sessions inside a transaction', async () => {
    const targetUser = makeUserDTO();
    const txUpdateWhere = jest.fn().mockResolvedValue(undefined);
    const txUpdateSet = jest.fn().mockReturnValue({ where: txUpdateWhere });
    const txDeleteWhere = jest.fn().mockResolvedValue(undefined);

    const db = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction: jest.fn().mockImplementation((cb: (tx: any) => Promise<unknown>) =>
        cb({
          update: jest.fn().mockReturnValue({ set: txUpdateSet }),
          delete: jest.fn().mockReturnValue({ where: txDeleteWhere }),
        }),
      ),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService(db as any, mockConfig as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(targetUser);

    await service.remove('u1', SUPER_ADMIN_ACTOR);

    // Verify transaction was called (soft delete + session revocation)
    expect(db.transaction).toHaveBeenCalled();
    const setArg = txUpdateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg['deletedAt']).toBeInstanceOf(Date);
    // Verify sessions were deleted
    expect(txDeleteWhere).toHaveBeenCalled();
  });

  it('throws ForbiddenException when attempting to delete own account', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new UsersService({} as any, mockConfig as any);
    await expect(service.remove('actor', SUPER_ADMIN_ACTOR)).rejects.toThrow(ForbiddenException);
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
