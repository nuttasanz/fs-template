import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UserDTO,
  UserRole,
  UserStatus,
  FindUsersQueryDTO,
} from '@repo/schemas';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';
import { profiles, sessions, users } from '../database/schema';
import type { SessionUser } from '../common/types/session.types';
import { APP_CONFIG, type AppConfig } from '../config/config.module';
import { canManageRole } from '@repo/schemas';

export type FindUsersQuery = FindUsersQueryDTO;

export interface PaginatedUsers {
  data: UserDTO[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async getStats(): Promise<{ totalUsers: number; activeSessions: number }> {
    const [userCount] = await this.db
      .select({ count: count() })
      .from(users)
      .where(isNull(users.deletedAt));

    const [sessionCount] = await this.db
      .select({ count: count() })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()));

    return {
      totalUsers: userCount?.count ?? 0,
      activeSessions: sessionCount?.count ?? 0,
    };
  }

  async findAll(query: FindUsersQuery): Promise<PaginatedUsers> {
    const pageSize = Math.min(
      query.pageSize ?? this.config.USERS_PAGE_LIMIT,
      this.config.USERS_PAGE_LIMIT_MAX,
    );
    const page = Math.max(query.page ?? 1, 1);

    const conditions: (SQL | undefined)[] = [
      isNull(users.deletedAt),
      query.role ? eq(users.role, query.role) : undefined,
      query.status ? eq(users.status, query.status) : undefined,
    ];

    // PERF: Leading-wildcard ILIKE ('%term%') cannot use a B-tree index.
    // Acceptable for <50K rows. For larger datasets consider pg_trgm + GIN:
    //   CREATE EXTENSION IF NOT EXISTS pg_trgm;
    //   CREATE INDEX profiles_name_trgm_idx ON profiles
    //     USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(profiles.firstName, term),
          ilike(profiles.lastName, term),
          ilike(sql`${profiles.firstName} || ' ' || ${profiles.lastName}`, term),
        ),
      );
    }

    const where = and(...conditions.filter(Boolean));

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(where),
      this.db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          bio: profiles.bio,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(where)
        .orderBy(desc(users.createdAt), desc(users.id))
        .offset((page - 1) * pageSize)
        .limit(pageSize),
    ]);

    const totalItems = countResult[0]?.count ?? 0;
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
    const [row] = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        bio: profiles.bio,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (!row) throw new NotFoundException('User not found.');
    return this.toUserDTO(row);
  }

  async create(dto: CreateUserDTO, actor: SessionUser): Promise<UserDTO> {
    this.enforceRbac(actor.role, dto.role);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const row = await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({ email: dto.email, passwordHash, role: dto.role, status: 'ACTIVE' })
          .returning();

        if (!user)
          throw new InternalServerErrorException('Failed to create user. Please try again.');

        const [profile] = await tx
          .insert(profiles)
          .values({
            userId: user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            bio: dto.bio ?? null,
          })
          .returning();

        if (!profile)
          throw new InternalServerErrorException('Failed to create user. Please try again.');

        return { ...user, ...profile };
      });

      return this.toUserDTO(row);
    } catch (e) {
      // pg unique_violation (SQLSTATE 23505) — email already taken.
      if (e instanceof Error && 'code' in e && (e as Record<string, unknown>)['code'] === '23505') {
        throw new ConflictException('User with this email already exists.');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDTO, actor: SessionUser): Promise<UserDTO> {
    const target = await this.findOne(id);
    this.enforceRbac(actor.role, target.role);

    if (dto.role !== undefined) this.enforceRbac(actor.role, dto.role);

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ ...(dto.role !== undefined && { role: dto.role }), updatedAt: new Date() })
        .where(eq(users.id, id));

      await tx
        .update(profiles)
        .set({
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(dto.bio !== undefined && { bio: dto.bio ?? null }),
        })
        .where(eq(profiles.userId, id));
    });

    return this.findOne(id);
  }

  async remove(id: string, actor: SessionUser): Promise<void> {
    if (id === actor.id) {
      throw new ForbiddenException('Cannot delete your own account.');
    }

    const target = await this.findOne(id);
    this.enforceRbac(actor.role, target.role);

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, id));

      // Revoke all active sessions — prevents deleted user from retaining access.
      await tx.delete(sessions).where(eq(sessions.userId, id));
    });
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

  private toUserDTO(row: {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
  }): UserDTO {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      profile: {
        firstName: row.firstName!,
        lastName: row.lastName!,
        bio: row.bio ?? null,
      },
    };
  }
}
