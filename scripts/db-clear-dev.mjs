// Deletes test users made with the dev sign-in (uid "dev:…") and their plays. Run: npm run db:clear-dev
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL);
const gone = await sql`delete from users where uid like 'dev:%' returning username`;
console.log(`Removed ${gone.length} test users.`);
