import { pool } from './db.js';
import { getSeedTables } from '../src/utils/mockDb.js';

const seedTables = getSeedTables();
export const TABLE_NAMES = Object.keys(seedTables);

export async function initializeStore() {
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
}

export async function resetStore() {
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

export async function readTables(names = TABLE_NAMES) {
  const { rows } = await pool.query(
    'select name, records from bloodcoord_store where name = any($1)',
    [names]
  );

  const state = {};
  for (const name of names) state[name] = [];
  for (const row of rows) state[row.name] = row.records || [];
  return state;
}

export async function withTables(names, handler) {
  const client = await pool.connect();
  try {
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
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
