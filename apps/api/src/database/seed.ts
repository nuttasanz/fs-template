/**
 * Seed script — creates the first SUPER_ADMIN if none exists.
 * Run via: pnpm --filter @repo/api db:seed
 *
 * Required env vars: DATABASE_URL, SEED_EMAIL, SEED_PASSWORD
 * Optional env vars: SEED_FIRST_NAME, SEED_LAST_NAME
 */
import 'reflect-metadata';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from './schema';

async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const db = drizzle(pool, { schema });

  const email = process.env['SEED_EMAIL'] ?? 'admin@example.com';
  const password = process.env['SEED_PASSWORD'] ?? 'ChangeMe123!@#';
  const firstName = process.env['SEED_FIRST_NAME'] ?? 'System';
  const lastName = process.env['SEED_LAST_NAME'] ?? 'Admin';

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, 'SUPER_ADMIN'))
    .limit(1);

  if (existing.length > 0) {
    console.log('SUPER_ADMIN already exists — skipping seed.');
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(schema.users)
    .values({ email, passwordHash, role: 'SUPER_ADMIN', status: 'ACTIVE' })
    .returning({ id: schema.users.id });

  if (!user) throw new Error('Failed to insert seed user.');

  await db.insert(schema.profiles).values({
    userId: user.id,
    firstName,
    lastName,
    bio: null,
  });

  console.log(`SUPER_ADMIN created: ${email}`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
