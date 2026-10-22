import { neon } from '@neondatabase/serverless';

type Row = Record<string, unknown>;
type Exec = (text: string, params?: unknown[]) => Promise<Row[]>;

const g = globalThis as unknown as { __exec?: Promise<Exec> };

async function makeExec(): Promise<Exec> {
  // Local trial mode (npm run dev:local): an in-process Postgres, no Neon account needed.
  if (process.env.DB_DRIVER === 'pglite') {
    const pkg = '@electric-sql/pglite';
    const { PGlite } = await import(/* webpackIgnore: true */ pkg);
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const db = new PGlite(process.env.PGLITE_DIR || undefined);
    await db.exec(readFileSync(join(process.cwd(), 'schema.sql'), 'utf8'));
    return async (text, params = []) => (await db.query(text, params)).rows as Row[];
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = neon(url);
  return async (text, params = []) => (await sql.query(text, params as unknown[])) as Row[];
}

/** Run one parameterised SQL statement and return its rows. */
export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  g.__exec ??= makeExec();
  const exec = await g.__exec;
  return (await exec(text, params)) as T[];
}
