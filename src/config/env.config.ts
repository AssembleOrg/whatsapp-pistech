import { z } from 'zod/v4';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  AUTH_DIR: z.string().default('./auth_info'),
  API_KEY: z.string().min(8),
  QR_PASSWORD: z.string().min(4),
  WHITELISTED_GROUPS: z.string().default(''),
  ALLOWED_ORIGINS: z.string().default('*'),
  MESSAGE_DELAY_MIN: z.coerce.number().default(15000),
  MESSAGE_DELAY_MAX: z.coerce.number().default(25000),
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(20),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}
