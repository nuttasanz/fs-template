import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UserDTO,
  UserRole,
  FindUsersQueryDTO,
  UserStatsDTO,
  PaginatedMeta,
} from '@repo/schemas';
import { canManageRole } from '@repo/schemas';
import { APP_CONFIG, type AppConfig } from '../config/config.module';
import type { SessionUser } from '../common/types/session.types';
import { isPgDatabaseError } from '../common/types/pg-error.types';
import { UsersRepository, type UserRow } from './users.repository';

export interface PaginatedUsers extends PaginatedMeta {
  data: UserDTO[];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async getStats(): Promise<UserStatsDTO> {
    const [totalUsers, activeSessions] = await Promise.all([
      this.usersRepo.countUsers(),
      this.usersRepo.countActiveSessions(),
    ]);
    return { totalUsers, activeSessions };
  }

  async findAll(query: FindUsersQueryDTO): Promise<PaginatedUsers> {
    const pageSize = Math.min(
      query.pageSize ?? this.config.USERS_PAGE_LIMIT,
      this.config.USERS_PAGE_LIMIT_MAX,
    );
    const page = Math.max(query.page ?? 1, 1);

    const { rows, totalItems } = await this.usersRepo.findPaginated(query, pageSize, page);
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: rows.map((r) => this.toUserDTO(r)),
      totalItems,
      totalPages,
      currentPage: page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<UserDTO> {
    const row = await this.usersRepo.findById(id);
    if (!row) throw new NotFoundException('User not found.');
    return this.toUserDTO(row);
  }

  async create(dto: CreateUserDTO, actor: SessionUser): Promise<UserDTO> {
    this.enforceRbac(actor.role, dto.role);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const row = await this.usersRepo.createWithProfile(
        { email: dto.email, passwordHash, role: dto.role },
        { firstName: dto.firstName, lastName: dto.lastName, bio: dto.bio ?? null },
      );
      return this.toUserDTO(row);
    } catch (e) {
      // pg unique_violation (SQLSTATE 23505) — email already taken.
      if (isPgDatabaseError(e) && e.code === '23505') {
        throw new ConflictException('User with this email already exists.');
      }
      if (e instanceof Error && e.message.startsWith('Failed to insert')) {
        throw new InternalServerErrorException('Failed to create user. Please try again.');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDTO, actor: SessionUser): Promise<UserDTO> {
    const found = await this.usersRepo.updateWithProfile(
      id,
      { role: dto.role },
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio !== undefined ? (dto.bio ?? null) : undefined,
      },
      (targetRole) => {
        this.enforceRbac(actor.role, targetRole);
        if (dto.role !== undefined) this.enforceRbac(actor.role, dto.role);
      },
    );

    if (!found) throw new NotFoundException('User not found.');

    return this.findOne(id);
  }

  async remove(id: string, actor: SessionUser): Promise<void> {
    if (id === actor.id) {
      throw new ForbiddenException('Cannot delete your own account.');
    }

    const target = await this.findOne(id);
    this.enforceRbac(actor.role, target.role);

    await this.usersRepo.softDelete(id);
  }

  /**
   * Deny if the actor is not SUPER_ADMIN and the target role is >= the actor's own role.
   * Satisfies: "ADMIN CANNOT Create/Update/Delete other ADMIN or SUPER_ADMIN roles."
   */
  private enforceRbac(actorRole: UserRole, targetRole: UserRole): void {
    if (!canManageRole(actorRole, targetRole)) {
      throw new ForbiddenException('You do not have permission to manage users with this role.');
    }
  }

  private toUserDTO(row: UserRow): UserDTO {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      profile: {
        firstName: row.firstName,
        lastName: row.lastName,
        bio: row.bio ?? null,
      },
    };
  }
}
