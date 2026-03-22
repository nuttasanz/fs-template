import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gt, isNull, lt, or } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import type { CreateUserDTO, UpdateUserDTO, UserDTO, UserRole, UserStatus } from '@repo/schemas';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';
import { profiles, sessions, users } from '../database/schema';
import type { SessionUser } from '../common/types/session.types';
import { APP_CONFIG, type AppConfig } from '../config/config.module';
import { canManageRole } from '@repo/schemas';

export interface FindUsersQuery {
  cursor?: string;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
}

export interface PaginatedUsers {
  data: UserDTO[];
  nextCursor: string | null;
  limit: number;
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
    const limit = Math.min(
      query.limit ?? this.config.USERS_PAGE_LIMIT,
      this.config.USERS_PAGE_LIMIT_MAX,
    );

    let cursorDate: Date | undefined;
    let cursorId: string | undefined;
    if (query.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf-8')) as {
          createdAt: string;
          id: string;
        };
        cursorDate = new Date(decoded.createdAt);
        cursorId = decoded.id;
        if (isNaN(cursorDate.getTime()) || !cursorId) throw new Error();
      } catch {
        throw new BadRequestException('Invalid pagination cursor.');
      }
    }

    const baseConditions = [
      isNull(users.deletedAt),
      query.role ? eq(users.role, query.role) : undefined,
      query.status ? eq(users.status, query.status) : undefined,
    ].filter(Boolean);

    const cursorCondition =
      cursorDate && cursorId
        ? or(
            lt(users.createdAt, cursorDate),
            and(eq(users.createdAt, cursorDate), lt(users.id, cursorId)),
          )
        : undefined;

    const allConditions = [...baseConditions, cursorCondition].filter(Boolean);
    const where =
      allConditions.length > 0 ? and(...(allConditions as Parameters<typeof and>)) : undefined;

    // Fetch limit+1 to detect whether a next page exists without a COUNT(*) query.
    const rows = await this.db
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
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = page.at(-1);

    const nextCursor =
      hasMore && lastRow
        ? Buffer.from(
            JSON.stringify({
              createdAt: lastRow.createdAt.toISOString(),
              id: lastRow.id,
            }),
          ).toString('base64url')
        : null;

    return { data: page.map((r) => this.toUserDTO(r)), nextCursor, limit };
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

        if (!user) throw new InternalServerErrorException('Failed to create user. Please try again.');

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

    if (dto.role) this.enforceRbac(actor.role, dto.role);

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ ...(dto.role && { role: dto.role }), updatedAt: new Date() })
        .where(eq(users.id, id));

      await tx
        .update(profiles)
        .set({
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName && { lastName: dto.lastName }),
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
        firstName: row.firstName ?? '',
        lastName: row.lastName ?? '',
        bio: row.bio ?? null,
      },
    };
  }
}
