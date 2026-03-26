import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { FindUsersQueryDTO, UserRole, UserStatus } from '@repo/schemas';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';
import { profiles, sessions, users } from '../database/schema';

/** Raw row shape returned by user + profile joins. */
export interface UserRow {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string;
  bio: string | null;
}

export interface PaginatedRows {
  rows: UserRow[];
  totalItems: number;
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  // ── Reads ────────────────────────────────────────────────────────────────

  async countUsers(): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(users)
      .where(isNull(users.deletedAt));
    return row?.count ?? 0;
  }

  async countActiveSessions(): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()));
    return row?.count ?? 0;
  }

  async findById(id: string): Promise<UserRow | null> {
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
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return row ?? null;
  }

  async findPaginated(
    query: FindUsersQueryDTO,
    pageSize: number,
    page: number,
  ): Promise<PaginatedRows> {
    const conditions: (SQL | undefined)[] = [
      isNull(users.deletedAt),
      query.role ? eq(users.role, query.role) : undefined,
      query.status ? eq(users.status, query.status) : undefined,
    ];

    // PERF: Leading-wildcard ILIKE ('%term%') cannot use a B-tree index.
    // Acceptable for <50K rows. For larger datasets consider pg_trgm + GIN.
    if (query.search) {
      const escaped = query.search.replace(/[%_\\]/g, '\\$&');
      const term = `%${escaped}%`;
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
        .innerJoin(profiles, eq(profiles.userId, users.id))
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
        .innerJoin(profiles, eq(profiles.userId, users.id))
        .where(where)
        .orderBy(desc(users.createdAt), desc(users.id))
        .offset((page - 1) * pageSize)
        .limit(pageSize),
    ]);

    return {
      rows,
      totalItems: countResult[0]?.count ?? 0,
    };
  }

  // ── Writes ───────────────────────────────────────────────────────────────

  async createWithProfile(
    data: { email: string; passwordHash: string; role: UserRole },
    profile: { firstName: string; lastName: string; bio: string | null },
  ): Promise<UserRow> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email: data.email, passwordHash: data.passwordHash, role: data.role, status: 'ACTIVE' })
        .returning();

      if (!user) throw new Error('Failed to insert user row.');

      const [prof] = await tx
        .insert(profiles)
        .values({
          userId: user.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          bio: profile.bio,
        })
        .returning();

      if (!prof) throw new Error('Failed to insert profile row.');

      return { ...user, firstName: prof.firstName, lastName: prof.lastName, bio: prof.bio };
    });
  }

  /**
   * Update user and profile fields inside a transaction with row-level locking.
   * The `validate` callback runs after the row is locked but before any writes,
   * so RBAC enforcement can abort the transaction cleanly.
   */
  async updateWithProfile(
    id: string,
    userFields: { role?: UserRole },
    profileFields: { firstName?: string; lastName?: string; bio?: string | null },
    validate: (targetRole: UserRole) => void,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Lock the row for the duration of the transaction to prevent a concurrent
      // request from changing the target's role between the RBAC check and the write.
      const [target] = await tx
        .select({ role: users.role })
        .from(users)
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .for('update')
        .limit(1);

      if (!target) return false;

      // RBAC validation runs inside the transaction — throws to abort on failure.
      validate(target.role);

      await tx
        .update(users)
        .set({ ...(userFields.role !== undefined && { role: userFields.role }), updatedAt: new Date() })
        .where(eq(users.id, id));

      const profileUpdate: Record<string, unknown> = {};
      if (profileFields.firstName !== undefined) profileUpdate.firstName = profileFields.firstName;
      if (profileFields.lastName !== undefined) profileUpdate.lastName = profileFields.lastName;
      if (profileFields.bio !== undefined) profileUpdate.bio = profileFields.bio;

      if (Object.keys(profileUpdate).length > 0) {
        await tx.update(profiles).set(profileUpdate).where(eq(profiles.userId, id));
      }

      return true;
    });
  }

  /** Soft-delete a user and revoke all their active sessions. */
  async softDelete(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, id));

      // Revoke all active sessions — prevents deleted user from retaining access.
      await tx.delete(sessions).where(eq(sessions.userId, id));
    });
  }
}
