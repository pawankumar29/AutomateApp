import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { ENV } from './env.js';
import * as schema from '../db/schema.js';

export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });
