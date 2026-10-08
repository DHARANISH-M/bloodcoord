import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { getSeedTables } from '../src/utils/mockDb.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storeDir = path.resolve(rootDir, 'server', 'data');
const storeFilePath = path.resolve(storeDir, 'bloodcoord_store.json');

const seedTables = getSeedTables();
export const TABLE_NAMES = Object.keys(seedTables);

let usePostgres = false;
let memoryStore = null;

function loadFileStore() {
  if (memoryStore) return memoryStore;
  try {
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    if (fs.existsSync(storeFilePath)) {
      const raw = fs.readFileSync(storeFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      memoryStore = { ...seedTables, ...parsed };
    } else {
      memoryStore = JSON.parse(JSON.stringify(seedTables));
      fs.writeFileSync(storeFilePath, JSON.stringify(memoryStore, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('[Store] Local JSON file store warning:', err.message);
    memoryStore = JSON.parse(JSON.stringify(seedTables));
  }
  return memoryStore;
}

function persistFileStore() {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    fs.writeFileSync(storeFilePath, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Store] Failed to write store file:', err.message);
  }
}

export async function initializeStore() {
  try {
    const res = await pool.query('select 1');
    if (res) {
      await pool.query(`
        create table if not exists bloodcoord_store (
          name text primary key,
          records jsonb not null default '[]'::jsonb,
          updated_at timestamptz not null default now()
        )
      `);

      for (const [name, records] of Object.entries(seedTables)) {
        await pool.query(
          `insert into bloodcoord_store (name, records)
           values ($1, $2::jsonb)
           on conflict (name) do nothing`,
          [name, JSON.stringify(records)]
        );
      }
      usePostgres = true;
      console.log('✓ [Store] PostgreSQL database connected and initialized.');
      return;
    }
  } catch (error) {
    usePostgres = false;
    console.warn(`! [Store] PostgreSQL not reachable (${error.message}). Running with persistent file/memory store.`);
  }

  loadFileStore();
}

export async function resetStore() {
  if (usePostgres) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from bloodcoord_store');
      for (const [name, records] of Object.entries(getSeedTables())) {
        await client.query(
          'insert into bloodcoord_store (name, records) values ($1, $2::jsonb)',
          [name, JSON.stringify(records)]
        );
      }
      await client.query('commit');
      return { success: true };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  memoryStore = JSON.parse(JSON.stringify(getSeedTables()));
  persistFileStore();
  return { success: true };
}

export async function readTables(names = TABLE_NAMES) {
  if (usePostgres) {
    try {
      const { rows } = await pool.query(
        'select name, records from bloodcoord_store where name = any($1)',
        [names]
      );

      const state = {};
      for (const name of names) state[name] = [];
      for (const row of rows) state[row.name] = row.records || [];
      return state;
    } catch (err) {
      console.warn('[Store] Postgres read failed, falling back to local memory store:', err.message);
    }
  }

  const store = loadFileStore();
  const state = {};
  for (const name of names) {
    state[name] = store[name] ? JSON.parse(JSON.stringify(store[name])) : [];
  }
  return state;
}

export async function withTables(names, handler) {
  if (usePostgres) {
    let client;
    try {
      client = await pool.connect();
      await client.query('begin');
      const { rows } = await client.query(
        'select name, records from bloodcoord_store where name = any($1) for update',
        [names]
      );

      const state = {};
      for (const name of names) state[name] = [];
      for (const row of rows) state[row.name] = row.records || [];

      const result = await handler(state);

      for (const name of names) {
        await client.query(
          'update bloodcoord_store set records = $2::jsonb, updated_at = now() where name = $1',
          [name, JSON.stringify(state[name] || [])]
        );
      }

      await client.query('commit');
      return result;
    } catch (error) {
      if (client) await client.query('rollback').catch(() => {});
      console.warn('[Store] Postgres withTables failed, falling back to local memory store:', error.message);
      // Fall through to file/memory handler if Postgres failed
    } finally {
      if (client) client.release();
    }
  }

  const store = loadFileStore();
  const state = {};
  for (const name of names) {
    state[name] = store[name] ? store[name] : [];
  }

  const result = await handler(state);

  for (const name of names) {
    store[name] = state[name];
  }
  persistFileStore();

  return result;
}

