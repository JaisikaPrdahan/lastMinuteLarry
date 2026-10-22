// Creates all tables in your Neon database. Safe to re-run.
//   npm run db:init      (reads DATABASE_URL from .env.local)
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing. Put it in .env.local first (see .env.example).');
  process.exit(1);
}
const sql = neon(url);
const statements = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const s of statements) await sql.query(s);
console.log(`Database ready (${statements.length} statements applied).`);
