import { createRemoteJWKSet, jwtVerify } from 'jose';
import { isCountry } from '../src/lib/countries.js';
import type { Repo, User } from './service.js';

const GOOGLE_KEYS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

type Identity = { uid: string; name: string; email: string };

/** Reads the Firebase ID token. Outside production, ACCOUNTS_DEV_AUTH=1 also accepts "Dev <name>" for testing. */
async function identify(req: Request): Promise<Identity | null> {
  const h = req.headers.get('authorization') ?? '';
  if (h.startsWith('Dev ') && process.env.ACCOUNTS_DEV_AUTH === '1' && process.env.VERCEL_ENV !== 'production') {
    const name = h.slice(4).trim();
    return name ? { uid: `dev:${name}`, name, email: '' } : null;
  }
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!h.startsWith('Bearer ') || !project) return null;
  try {
    const { payload } = await jwtVerify(h.slice(7), GOOGLE_KEYS, { issuer: `https://securetoken.google.com/${project}`, audience: project });
    return payload.sub ? { uid: payload.sub, name: String(payload.name ?? ''), email: String(payload.email ?? '') } : null;
  } catch {
    return null;
  }
}

/** The signed-in user, created on first visit with a country guess from Vercel's header. Null for guests. */
export async function currentUser(req: Request, repo: Repo): Promise<User | null> {
  const id = await identify(req);
  if (!id) return null;
  const found = await repo.findUser(id.uid);
  if (found) return found;
  const guess = req.headers.get('x-vercel-ip-country') ?? '';
  return repo.addUser({ ...id, country: isCountry(guess) ? guess : null });
}
