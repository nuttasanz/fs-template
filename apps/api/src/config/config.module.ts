import { Global, Logger, Module } from '@nestjs/common';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema — all required environment variables, validated at bootstrap.
// ---------------------------------------------------------------------------

const AppConfigSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS is required'),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  USERS_PAGE_LIMIT: z.coerce.number().int().positive().default(20),
  USERS_PAGE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_POOL_IDLE_TIMEOUT: z.coerce.number().int().nonnegative().default(10000),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// ---------------------------------------------------------------------------
// Injection token — use this symbol to inject AppConfig in any provider.
// ---------------------------------------------------------------------------

export const APP_CONFIG = Symbol('APP_CONFIG');

// ---------------------------------------------------------------------------
// Module — @Global() so consumers don't need to re-import ConfigModule.
// ---------------------------------------------------------------------------

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => {
        const logger = new Logger('ConfigModule');
        const result = AppConfigSchema.safeParse(process.env);
        if (!result.success) {
          logger.error('Missing or invalid environment variables:');
          result.error.issues.forEach(({ path, message }) =>
            logger.error(`  ${path.join('.')}: ${message}`),
          );
          process.exit(1);
        }
        return result.data;
      },
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
