import type { RuntimeState } from './runtime-state';
import type { FunnelEvent } from '../observability/funnel-telemetry';

let poolRef: any;
let initialized = false;

function resolveDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0) {
    return null;
  }
  return url;
}

async function getPool(): Promise<any | null> {
  if (poolRef) {
    return poolRef;
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    return null;
  }

  const pg = await import('pg');
  const { Pool } = pg as any;
  poolRef = new Pool({ connectionString: databaseUrl });
  return poolRef;
}

async function initTables(pool: any): Promise<void> {
  if (initialized) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS runtime_state_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS funnel_event_log (
      id BIGSERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  initialized = true;
}

export async function isPostgresAvailable(): Promise<boolean> {
  const pool = await getPool();
  return !!pool;
}

export async function checkPostgresConnection(): Promise<{ ok: boolean; detail: string }> {
  try {
    const pool = await getPool();
    if (!pool) {
      return { ok: false, detail: 'DATABASE_URL is not configured.' };
    }

    await initTables(pool);
    await pool.query('SELECT 1');
    return { ok: true, detail: 'Postgres reachable.' };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'Postgres health probe failed.'
    };
  }
}

export async function readRuntimeStateFromPostgres(): Promise<RuntimeState | null> {
  const pool = await getPool();
  if (!pool) {
    return null;
  }

  await initTables(pool);

  const result = await pool.query(
    'SELECT value FROM runtime_state_store WHERE key = $1 LIMIT 1',
    ['runtime_state']
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0].value as RuntimeState;
}

export async function writeRuntimeStateToPostgres(state: RuntimeState): Promise<void> {
  const pool = await getPool();
  if (!pool) {
    return;
  }

  await initTables(pool);

  await pool.query(
    `
      INSERT INTO runtime_state_store (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `,
    ['runtime_state', JSON.stringify(state)]
  );
}

export async function appendFunnelEventToPostgres(event: FunnelEvent): Promise<void> {
  const pool = await getPool();
  if (!pool) {
    return;
  }

  await initTables(pool);

  await pool.query(
    `
      INSERT INTO funnel_event_log (event_type, occurred_at, payload)
      VALUES ($1, $2::timestamptz, $3::jsonb)
    `,
    [event.type, event.occurredAt, JSON.stringify(event.payload)]
  );
}
