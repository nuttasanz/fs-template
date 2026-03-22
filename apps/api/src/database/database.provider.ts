import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { APP_CONFIG, type AppConfig } from '../config/config.module';

export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

export const DrizzleProvider = {
  provide: DRIZZLE_CLIENT,
  inject: [APP_CONFIG],
  useFactory: async (config: AppConfig): Promise<DrizzleClient> => {
    const logger = new Logger('DatabaseProvider');
    const pool = new Pool({ connectionString: config.DATABASE_URL });
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
