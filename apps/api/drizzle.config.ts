import path from 'path';
import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

config({ path: path.resolve(__dirname, '../../.env') });

export default {
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
} satisfies Config;
