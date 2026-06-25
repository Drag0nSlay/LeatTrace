/**
 * db/pool.js
 * Shared pg Pool instance. Import this everywhere instead of
 * creating new Pool() calls scattered through the codebase.
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'leatrace',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || '',
  // Keep a small pool – we're not doing high concurrency yet
  max:               10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// Quick connectivity check on startup
pool.query('SELECT 1').then(() => {
  console.log('[DB] PostgreSQL connected');
}).catch((err) => {
  console.error('[DB] Could not connect to PostgreSQL:', err.message);
  console.error('     Check your .env PG_* variables and make sure the DB is running.');
  process.exit(1);
});

export default pool;