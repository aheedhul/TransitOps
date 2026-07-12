import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../lib/env.js';
import * as schema from '../db/schema.js';

const client = postgres(env.DATABASE_URL, { max: 1 });

export const testDb = drizzle(client, { schema });

export async function clearTestDb() {
  await client.end();
}
