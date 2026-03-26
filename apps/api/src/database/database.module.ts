import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { DrizzleProvider, PgPoolProvider, PG_POOL } from './database.provider';

@Global()
@Module({
  providers: [PgPoolProvider, DrizzleProvider],
  exports: [PgPoolProvider, DrizzleProvider],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing database pool (signal: ${signal ?? 'none'})`);
    await this.pool.end();
    this.logger.log('Database pool closed');
  }
}
