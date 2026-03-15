import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

export const DrizzleProvider = {
  provide: DRIZZLE_CLIENT,
  useFactory: (): DrizzleClient => {
    const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
    return drizzle(pool, { schema });
  },
};
