/**
 * Bulk seed script — creates 1000 test users for pagination testing.
 * Run via: pnpm --filter @repo/api db:seed:bulk
 */
import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../../../.env') });

import 'reflect-metadata';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcrypt';
import * as schema from './schema';

const TOTAL_USERS = 1000000;
const BATCH_SIZE = 10000;

const FIRST_NAMES = [
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'David',
  'Elizabeth',
  'William',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Daniel',
  'Lisa',
  'Matthew',
  'Nancy',
  'Anthony',
  'Betty',
  'Mark',
  'Margaret',
  'Steven',
  'Sandra',
  'Paul',
  'Ashley',
  'Andrew',
  'Dorothy',
  'Joshua',
  'Kimberly',
  'Kenneth',
  'Emily',
  'Kevin',
  'Donna',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
];

const ROLES: ('USER' | 'ADMIN')[] = ['USER', 'USER', 'USER', 'USER', 'ADMIN']; // 80% USER, 20% ADMIN
const STATUSES: ('ACTIVE' | 'INACTIVE' | 'SUSPENDED')[] = [
  'ACTIVE',
  'ACTIVE',
  'ACTIVE',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function seedBulk(): Promise<void> {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const db = drizzle(pool, { schema });

  // Hash a shared password once (saves time)
  const passwordHash = await bcrypt.hash('Password1!', 12);

  let created = 0;

  for (let batch = 0; batch < Math.ceil(TOTAL_USERS / BATCH_SIZE); batch++) {
    const batchCount = Math.min(BATCH_SIZE, TOTAL_USERS - created);
    const userValues = [];
    const profileMap: { email: string; firstName: string; lastName: string }[] = [];

    for (let i = 0; i < batchCount; i++) {
      const idx = created + i;
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const email = `user${idx.toString().padStart(4, '0')}@test.com`;
      const role = pick(ROLES);
      const status = pick(STATUSES);

      userValues.push({ email, passwordHash, role, status });
      profileMap.push({ email, firstName, lastName });
    }

    // Insert users batch
    const insertedUsers = await db
      .insert(schema.users)
      .values(userValues)
      .onConflictDoNothing()
      .returning({ id: schema.users.id, email: schema.users.email });

    // Insert profiles batch
    if (insertedUsers.length > 0) {
      const profileValues = insertedUsers.map((u) => {
        const info = profileMap.find((p) => p.email === u.email)!;
        return {
          userId: u.id,
          firstName: info.firstName,
          lastName: info.lastName,
          bio: null,
        };
      });

      await db.insert(schema.profiles).values(profileValues);
    }

    created += insertedUsers.length;
    console.log(`Seeded ${created} / ${TOTAL_USERS} users...`);
  }

  console.log(`\nDone! Total users seeded: ${created}`);
  await pool.end();
}

seedBulk().catch((err) => {
  console.error('Bulk seed failed:', err);
  process.exit(1);
});
