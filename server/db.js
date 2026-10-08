import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const { Pool } = pg;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveFromRoot(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath);
}

function getPort() {
  const port = Number(process.env.PGPORT || 5432);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PGPORT must be a valid PostgreSQL port. AWS RDS Postgres usually uses 5432; port 0 is invalid.');
  }
  return port;
}

function buildSslConfig() {
  const sslMode = process.env.PGSSLMODE || process.env.DB_SSLMODE;
  if (sslMode === 'disable' || sslMode === 'false' || sslMode === 'off') return false;

  const host = process.env.PGHOST || '';
  const isLocal = !process.env.DATABASE_URL && (!host || host === 'localhost' || host === '127.0.0.1');
  if (isLocal && !sslMode) return false;

  const certPath = process.env.PGSSLROOTCERT || process.env.DB_SSLROOTCERT;
  if (!certPath) {
    if (sslMode === 'no-verify' || sslMode === 'prefer') {
      return { rejectUnauthorized: false };
    }
    return sslMode ? { rejectUnauthorized: sslMode !== 'no-verify' } : false;
  }

  try {
    return {
      ca: fs.readFileSync(resolveFromRoot(certPath), 'utf8'),
      rejectUnauthorized: sslMode !== 'no-verify',
    };
  } catch (err) {
    console.warn('Could not read SSL CA cert:', err.message);
    return false;
  }
}

const baseConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: getPort(),
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
    };

export const pool = new Pool({
  ...baseConfig,
  ssl: buildSslConfig(),
  max: Number(process.env.PGPOOL_MAX || 10),
  connectionTimeoutMillis: 3000,
});

export async function checkDatabase() {
  try {
    const { rows } = await pool.query('select now() as now');
    return { ok: true, now: rows[0]?.now };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
