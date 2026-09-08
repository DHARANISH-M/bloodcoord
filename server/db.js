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
  const sslMode = process.env.PGSSLMODE || process.env.DB_SSLMODE || 'verify-full';
  if (sslMode === 'disable') return false;

  const certPath = process.env.PGSSLROOTCERT || process.env.DB_SSLROOTCERT;
  if (!certPath) {
    return { rejectUnauthorized: sslMode !== 'no-verify' };
  }

  return {
    ca: fs.readFileSync(resolveFromRoot(certPath), 'utf8'),
    rejectUnauthorized: sslMode !== 'no-verify',
  };
}

const baseConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST,
      port: getPort(),
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
    };

export const pool = new Pool({
  ...baseConfig,
  ssl: buildSslConfig(),
  max: Number(process.env.PGPOOL_MAX || 10),
});

export async function checkDatabase() {
  const { rows } = await pool.query('select now() as now');
  return rows[0];
}
