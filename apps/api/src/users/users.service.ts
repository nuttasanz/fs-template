import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UserDTO,
  UserRole,
  UserStatus,
} from '@repo/schemas';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';
import { profiles, users } from '../database/schema';
import type { SessionUser } from '../common/types/session.types';

export interface FindUsersQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
}

export interface PaginatedUsers {
  data: UserDTO[];
  total: number;
  page: number;
  limit: number;
}

// Numeric hierarchy for RBAC enforcement inside service methods.
const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findAll(query: FindUsersQuery): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [
      isNull(users.deletedAt),
      query.role ? eq(users.role, query.role) : undefined,
      query.status ? eq(users.status, query.status) : undefined,
    ].filter(Boolean);

    const where = conditions.length > 0 ? and(...(conditions as Parameters<typeof and>)) : undefined;

    const [rows, [countRow]] = await Promise.all([
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
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(users)
        .where(where),
    ]);

    const data = rows.map((row) => this.toUserDTO(row));
    return { data, total: countRow?.total ?? 0, page, limit };
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

    // Check email uniqueness.
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing) throw new ConflictException('Email is already in use.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db
      .insert(users)
      .values({ email: dto.email, passwordHash, role: dto.role, status: 'ACTIVE' })
      .returning();

    if (!user) throw new Error('Failed to insert user.');

    const [profile] = await this.db
      .insert(profiles)
      .values({
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio ?? null,
      })
      .returning();

    if (!profile) throw new Error('Failed to insert profile.');

    return this.toUserDTO({ ...user, ...profile });
  }

  async update(id: string, dto: UpdateUserDTO, actor: SessionUser): Promise<UserDTO> {
    const target = await this.findOne(id);
    this.enforceRbac(actor.role, target.role);

    if (dto.role) this.enforceRbac(actor.role, dto.role);

    await this.db
      .update(users)
      .set({
        ...(dto.role && { role: dto.role }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    await this.db
      .update(profiles)
      .set({
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.bio !== undefined && { bio: dto.bio ?? null }),
      })
      .where(eq(profiles.userId, id));

    return this.findOne(id);
  }

  async remove(id: string, actor: SessionUser): Promise<void> {
    const target = await this.findOne(id);
    this.enforceRbac(actor.role, target.role);

    await this.db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  /**
   * Deny if the actor is not SUPER_ADMIN and the target role is >= the actor's own role.
   * Satisfies: "ADMIN CANNOT Create/Update/Delete other ADMIN or SUPER_ADMIN roles."
   */
  private enforceRbac(actorRole: UserRole, targetRole: UserRole): void {
    if (
      actorRole !== 'SUPER_ADMIN' &&
      ROLE_HIERARCHY[targetRole] >= ROLE_HIERARCHY[actorRole]
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage users with this role.',
      );
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
