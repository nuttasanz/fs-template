import { UsersController } from './users.controller';
import type { UsersService } from './users.service';
import { PaginatedResponse } from '../common/responses/paginated.response';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService(overrides: Partial<UsersService> = {}): UsersService {
  return {
    findAll: jest.fn(),
    getStats: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as UsersService;
}

const ACTOR = { id: 'actor', email: 'admin@test.com', role: 'SUPER_ADMIN' as const };

const USER_DTO = {
  id: 'u1',
  email: 'user@test.com',
  role: 'USER' as const,
  status: 'ACTIVE' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  profile: { firstName: 'Alice', lastName: 'Smith', bio: null },
};

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe('UsersController — findAll', () => {
  it('returns a PaginatedResponse wrapping service results', async () => {
    const serviceResult = {
      data: [USER_DTO],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
      pageSize: 20,
    };
    const service = makeService({ findAll: jest.fn().mockResolvedValue(serviceResult) });
    const controller = new UsersController(service);

    const result = await controller.findAll({ page: 1, pageSize: 20 });

    expect(service.findAll).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(result).toBeInstanceOf(PaginatedResponse);
    expect(result.data).toEqual([USER_DTO]);
    expect(result.meta).toMatchObject({ totalItems: 1, totalPages: 1 });
  });
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

describe('UsersController — getStats', () => {
  it('delegates to service.getStats', async () => {
    const stats = { totalUsers: 42, activeSessions: 7 };
    const service = makeService({ getStats: jest.fn().mockResolvedValue(stats) });
    const controller = new UsersController(service);

    const result = await controller.getStats();

    expect(service.getStats).toHaveBeenCalled();
    expect(result).toEqual(stats);
  });
});

// ---------------------------------------------------------------------------
// findOne
// ---------------------------------------------------------------------------

describe('UsersController — findOne', () => {
  it('delegates to service.findOne with the id param', async () => {
    const service = makeService({ findOne: jest.fn().mockResolvedValue(USER_DTO) });
    const controller = new UsersController(service);

    const result = await controller.findOne('u1');

    expect(service.findOne).toHaveBeenCalledWith('u1');
    expect(result).toEqual(USER_DTO);
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('UsersController — create', () => {
  it('delegates to service.create with the DTO and actor', async () => {
    const dto = {
      email: 'new@test.com',
      password: 'StrongPw123!',
      role: 'USER' as const,
      firstName: 'Bob',
      lastName: 'Jones',
    };
    const service = makeService({ create: jest.fn().mockResolvedValue(USER_DTO) });
    const controller = new UsersController(service);

    const result = await controller.create(dto, ACTOR);

    expect(service.create).toHaveBeenCalledWith(dto, ACTOR);
    expect(result).toEqual(USER_DTO);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe('UsersController — update', () => {
  it('delegates to service.update with id, DTO, and actor', async () => {
    const dto = { firstName: 'Updated' };
    const service = makeService({ update: jest.fn().mockResolvedValue(USER_DTO) });
    const controller = new UsersController(service);

    const result = await controller.update('u1', dto, ACTOR);

    expect(service.update).toHaveBeenCalledWith('u1', dto, ACTOR);
    expect(result).toEqual(USER_DTO);
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe('UsersController — remove', () => {
  it('delegates to service.remove with id and actor', async () => {
    const service = makeService({ remove: jest.fn().mockResolvedValue(undefined) });
    const controller = new UsersController(service);

    const result = await controller.remove('u1', ACTOR);

    expect(service.remove).toHaveBeenCalledWith('u1', ACTOR);
    expect(result).toBeUndefined();
  });
});
