import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load .env.local from repo root if it exists (local dev only)
try {
  const envPath = join(process.cwd(), '../../.env.local');
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] ??= value;
  }
} catch {
  // .env.local not found   fine in CI/production
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().url().default('postgres://transitops:transitops@localhost:5432/transitops'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('transitops-documents'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_REGION: z.string().default('us-east-1'),
  JWT_ACCESS_SECRET: z.string().default('dev-access-secret-change-me-in-production'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-me-in-production'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2592000),
  LLM_PROVIDER: z.enum(['groq', 'gemini', 'none']).default('none'),
  LLM_MODEL: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  MAPS_PROVIDER: z.enum(['ors', 'google', 'mapbox', 'osrm']).default('ors'),
  MAPS_API_KEY: z.string().default(''),
  ORS_API_KEY: z.string().default(''),
  GOOGLE_MAPS_API_KEY: z.string().default(''),
  MAPBOX_TOKEN: z.string().default(''),
  PUSH_VAPID_PUBLIC_KEY: z.string().default(''),
  PUSH_VAPID_PRIVATE_KEY: z.string().default(''),
  PUSH_VAPID_SUBJECT: z.string().default('mailto:dev@transitops.dev'),
  SENTRY_DSN_API: z.string().default(''),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  DEFAULT_CURRENCY: z.string().default('INR'),
});

export const env = envSchema.parse(process.env);
