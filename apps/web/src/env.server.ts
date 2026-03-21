import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  INTERNAL_API_URL: z.string().url({ message: 'INTERNAL_API_URL must be a valid URL' }),
});

export const serverEnv = serverEnvSchema.parse({
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
});
