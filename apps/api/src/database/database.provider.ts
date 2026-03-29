import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { APP_CONFIG, type AppConfig } from '../config/config.module';

export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');
export const PG_POOL = Symbol('PG_POOL');

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

/** Provide the raw pg Pool so it can be shut down gracefully. */
export const PgPoolProvider = {
  provide: PG_POOL,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig): Pool => {
    return new Pool({
      connectionString: config.DATABASE_URL,
      max: config.DATABASE_POOL_MAX,
      idleTimeoutMillis: config.DATABASE_POOL_IDLE_TIMEOUT,
    });
  },
};

export const DrizzleProvider = {
  provide: DRIZZLE_CLIENT,
  inject: [PG_POOL],
  useFactory: async (pool: Pool): Promise<DrizzleClient> => {
    const logger = new Logger('DatabaseProvider');
    const db = drizzle(pool, { schema });

    try {
      await db.execute(sql`SELECT 1`);
      logger.log('Database connection verified');
    } catch (error) {
      logger.error('Failed to connect to database', (error as Error).stack);
      throw error;
    }

    return db;
  },
};
