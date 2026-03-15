import { Global, Module } from '@nestjs/common';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema — all required environment variables, validated at bootstrap.
// ---------------------------------------------------------------------------

const AppConfigSchema = z.object({
  DATABASE_URL:    z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET:  z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS is required'),
  PORT:            z.coerce.number().int().positive().default(3001),
  NODE_ENV:        z.enum(['development', 'production', 'test']).default('development'),
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
        const result = AppConfigSchema.safeParse(process.env);
        if (!result.success) {
          console.error('[Config] Missing or invalid environment variables:');
          result.error.issues.forEach(({ path, message }) =>
            console.error(`  ${path.join('.')}: ${message}`),
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
