// Creates the tables. Run: npm run db:migrate (reads DATABASE_URL_UNPOOLED from .env.local).
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = neon(url);
const text = readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8').replace(/--.*$/gm, '');
for (const stmt of text.split(';').map((s) => s.trim()).filter(Boolean)) await sql.query(stmt);
console.log('Tables ready.');
