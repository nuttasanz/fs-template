// Load .env from the monorepo root before any module imports — same as main.ts.
import { resolve } from 'node:path';
import { config } from 'dotenv';
config({ path: resolve(__dirname, '../../../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import * as schema from '../src/database/schema';

// ---------------------------------------------------------------------------
// Fixture constants — unique emails prevent collisions with real data.
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = 'e2e-admin@test.internal';
const ADMIN_PASSWORD = 'Admin@E2ETest1234';

const ADMIN_TARGET_EMAIL = 'e2e-admin-target@test.internal';
const ADMIN_TARGET_PASSWORD = 'AdminTarget@E2E1234';

const USER_TARGET_EMAIL = 'e2e-user-target@test.internal';
const USER_TARGET_PASSWORD = 'UserTarget@E2E1234';

const CREATED_USER_EMAIL = 'e2e-created-user@test.internal';

const FIXTURE_EMAILS = [ADMIN_EMAIL, ADMIN_TARGET_EMAIL, USER_TARGET_EMAIL, CREATED_USER_EMAIL];

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// ---------------------------------------------------------------------------
// Rate-limit accounting
// Rate limit on /auth/login: 5 requests per 15 min (ThrottlerGuard).
// All requests from supertest share the same key (127.0.0.1 + route).
// Tests are ordered so the rate-limit test runs LAST and consumes the
// remaining quota slots to trigger the 429 on the 6th total request.
//
// Request count per test:
//   beforeAll login:  1  (total: 1)
//   Scenario 1:       1  (total: 2)
//   Scenario 3:       1  (total: 3)
//   Scenario 4 fill:  2  (total: 5) → 6th request → 429
// ---------------------------------------------------------------------------

describe('App — E2E Integration', () => {
  let app: INestApplication;
  let db: DrizzleDb;

  // Session cookie for the ADMIN fixture actor (saved in beforeAll).
  let adminSid: string;

  // DB IDs resolved during fixture seeding.
  let adminUserId: string;
  let adminTargetId: string;
  let userTargetId: string;

  // ---------------------------------------------------------------------------
  // Setup: seed DB fixtures, bootstrap app, obtain admin session cookie.
  // ---------------------------------------------------------------------------

  beforeAll(async () => {
    // ── Direct DB connection for fixture management ────────────────────────
    const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
    db = drizzle(pool, { schema });

    // ── Cleanup from any previously interrupted test run ──────────────────
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.email, FIXTURE_EMAILS));
    if (existing.length > 0) {
      const ids = existing.map((u) => u.id);
      await db.delete(schema.auditLogs).where(inArray(schema.auditLogs.actorId, ids));
      await db.delete(schema.sessions).where(inArray(schema.sessions.userId, ids));
      await db.delete(schema.profiles).where(inArray(schema.profiles.userId, ids));
      await db.delete(schema.users).where(inArray(schema.users.id, ids));
    }

    // ── Seed ADMIN actor ──────────────────────────────────────────────────
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const [adminUser] = await db
      .insert(schema.users)
      .values({ email: ADMIN_EMAIL, passwordHash: adminHash, role: 'ADMIN', status: 'ACTIVE' })
      .returning({ id: schema.users.id });
    adminUserId = adminUser!.id;
    await db.insert(schema.profiles).values({ userId: adminUserId, firstName: 'E2E', lastName: 'Admin' });

    // ── Seed ADMIN target (used in RBAC-403 test) ─────────────────────────
    const adminTargetHash = await bcrypt.hash(ADMIN_TARGET_PASSWORD, 12);
    const [adminTarget] = await db
      .insert(schema.users)
      .values({ email: ADMIN_TARGET_EMAIL, passwordHash: adminTargetHash, role: 'ADMIN', status: 'ACTIVE' })
      .returning({ id: schema.users.id });
    adminTargetId = adminTarget!.id;
    await db.insert(schema.profiles).values({ userId: adminTargetId, firstName: 'E2E', lastName: 'AdminTarget' });

    // ── Seed USER target (used in soft-delete test) ───────────────────────
    const userTargetHash = await bcrypt.hash(USER_TARGET_PASSWORD, 12);
    const [userTarget] = await db
      .insert(schema.users)
      .values({ email: USER_TARGET_EMAIL, passwordHash: userTargetHash, role: 'USER', status: 'ACTIVE' })
      .returning({ id: schema.users.id });
    userTargetId = userTarget!.id;
    await db.insert(schema.profiles).values({ userId: userTargetId, firstName: 'E2E', lastName: 'UserTarget' });

    // ── Bootstrap NestJS app (mirrors main.ts global config) ─────────────
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication({ logger: false });
    app.use(helmet());
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // ── Obtain admin session cookie (1st login request — quota slot 1) ────
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    const setCookieHeader = loginRes.headers['set-cookie'] as string | string[] | undefined;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
    adminSid = cookies.find((c) => c.startsWith('sid=')) ?? '';
    expect(adminSid).toBeTruthy(); // fail fast if login is broken
  });

  // ---------------------------------------------------------------------------
  // Teardown: remove all fixture data and close the app.
  // ---------------------------------------------------------------------------

  afterAll(async () => {
    const survivors = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.email, FIXTURE_EMAILS));
    const ids = survivors.map((u) => u.id);

    if (ids.length > 0) {
      await db.delete(schema.auditLogs).where(inArray(schema.auditLogs.actorId, ids));
      await db.delete(schema.sessions).where(inArray(schema.sessions.userId, ids));
      await db.delete(schema.profiles).where(inArray(schema.profiles.userId, ids));
      await db.delete(schema.users).where(inArray(schema.users.id, ids));
    }

    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Scenario 1 — Successful login (quota slot 2)
  // ---------------------------------------------------------------------------

  it('POST /auth/login returns 200 and sets an HttpOnly sid cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ userId: adminUserId });

    const setCookieHeader = res.headers['set-cookie'] as string | string[] | undefined;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
    const sidCookie = cookies.find((c) => c.startsWith('sid='));
    expect(sidCookie).toMatch(/HttpOnly/i);
    expect(sidCookie).toMatch(/SameSite=Lax/i);
  });

  // ---------------------------------------------------------------------------
  // Scenario 2 — GET /auth/me with a valid session
  // ---------------------------------------------------------------------------

  it('GET /auth/me with valid session returns 200 and a correctly-shaped UserDTO', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', adminSid);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: adminUserId,
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      profile: { firstName: 'E2E', lastName: 'Admin' },
    });
    expect(typeof res.body.data.createdAt).toBe('string');
    expect(() => new Date(res.body.data.createdAt as string)).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // Scenario 3 — Login with wrong password (quota slot 3)
  // ---------------------------------------------------------------------------

  it('POST /auth/login with wrong password returns 401 AUTH_UNAUTHORIZED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'WrongPassword@123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('AUTH_UNAUTHORIZED');
  });

  // ---------------------------------------------------------------------------
  // Scenario 5 — ADMIN creates a USER; audit log entry is created
  // ---------------------------------------------------------------------------

  it('POST /users as ADMIN creating a USER role returns 201 and writes an audit log', async () => {
    const newEmail = CREATED_USER_EMAIL;
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminSid)
      .send({
        email: newEmail,
        password: 'CreatedUser@E2ETest1234',
        role: 'USER',
        firstName: 'E2E',
        lastName: 'Created',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: newEmail, role: 'USER' });

    // Verify audit log entry persisted for this creation.
    // For POST (CREATE), there is no :id param, so targetId is null in the log.
    // We verify by actor + action instead.
    const createdId = res.body.data.id as string;
    const logs = await db
      .select({ action: schema.auditLogs.action })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.actorId, adminUserId),
          eq(schema.auditLogs.action, 'CREATE'),
        ),
      );

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]!.action).toBe('CREATE');

    // Cleanup: physically remove the created user to keep the DB clean.
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, createdId));
    await db.delete(schema.profiles).where(eq(schema.profiles.userId, createdId));
    await db.delete(schema.users).where(eq(schema.users.id, createdId));
  });

  // ---------------------------------------------------------------------------
  // Scenario 6 — ADMIN cannot modify another ADMIN (RBAC enforced)
  // ---------------------------------------------------------------------------

  it('PATCH /users/:id as ADMIN targeting another ADMIN returns 403 FORBIDDEN', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${adminTargetId}`)
      .set('Cookie', adminSid)
      .send({ firstName: 'Hijacked' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // Scenario 7 — DELETE soft-deletes the user (row persists with deletedAt set)
  // ---------------------------------------------------------------------------

  it('DELETE /users/:id soft-deletes the user — the row persists with deletedAt set', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/users/${userTargetId}`)
      .set('Cookie', adminSid);

    expect(res.status).toBe(204);

    // Verify the row still exists and carries a deletedAt timestamp.
    const [row] = await db
      .select({ deletedAt: schema.users.deletedAt })
      .from(schema.users)
      .where(eq(schema.users.id, userTargetId));

    expect(row).toBeDefined();
    expect(row!.deletedAt).toBeInstanceOf(Date);
  });

  // ---------------------------------------------------------------------------
  // Scenario 8 — Logout invalidates the session; GET /me returns 401 afterward
  // ---------------------------------------------------------------------------

  it('POST /auth/logout clears the session; subsequent GET /auth/me returns 401', async () => {
    // Log in with a fresh session so that logging out does not break later tests
    // that reuse adminSid (all prior tests using adminSid have already run).
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const setCookieHeader = loginRes.headers['set-cookie'] as string | string[] | undefined;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
    const freshSid = cookies.find((c) => c.startsWith('sid=')) ?? '';

    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', freshSid);
    expect(logoutRes.status).toBe(204);

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', freshSid);
    expect(meRes.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // Scenario 4 — Rate limiting: 6th login attempt within 15 min → 429
  //
  // Quota accounting (all to /api/v1/auth/login from 127.0.0.1):
  //   beforeAll:   1 (slot 1)
  //   Scenario 1:  1 (slot 2)
  //   Scenario 3:  1 (slot 3)
  //   Scenario 8:  1 (slot 4)   ← the fresh login above
  //   Fill below:  1 (slot 5)   ← passes
  //   Final:       1 (slot 6)   → 429
  // ---------------------------------------------------------------------------

  it('POST /auth/login is rate-limited after 5 attempts within 15 min', async () => {
    // Fill slot 5 — any result (200 or 401) is acceptable here.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'Wrong@Fill1234' });

    // Slot 6 must be throttled.
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'Wrong@Final1234' });

    expect(res.status).toBe(429);
  });
});
