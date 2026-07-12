import { v5 as uuidv5 } from 'uuid';
import postgres from 'postgres';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const SEED_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

async function seed() {
  const sql = postgres(env.DATABASE_URL, { max: 1 });

  try {
    const healthId = uuidv5('healthz-seed', SEED_NAMESPACE);
    await sql`
      INSERT INTO healthz (id, checked_at)
      VALUES (${healthId}, now())
      ON CONFLICT (id) DO UPDATE SET checked_at = now()
    `;

    logger.info('seed complete');
  } finally {
    await sql.end();
  }
}

seed().catch((_error: unknown) => {
  logger.error({ err: _error }, 'seed failed');
  process.exit(1);
});
