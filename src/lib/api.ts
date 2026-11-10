/** Accounts and leaderboards stay hidden unless the build sets VITE_ACCOUNTS=1. */
export const ACCOUNTS = import.meta.env.VITE_ACCOUNTS === '1';

const DEV_KEY = 'chesspage:dev-user';

/** Dev builds only: a test sign-in by name, accepted by a local server with ACCOUNTS_DEV_AUTH=1. */
export function devUser(): string | null {
  if (!import.meta.env.DEV) return null;
  try {
    return localStorage.getItem(DEV_KEY);
  } catch {
    return null;
  }
}

export function setDevUser(name: string | null) {
  try {
    if (name) localStorage.setItem(DEV_KEY, name);
    else localStorage.removeItem(DEV_KEY);
  } catch {
    /* private mode: stay signed out */
  }
}

/** The Authorization header for the signed-in player, or null for a guest. Firebase plugs in here later. */
async function auth(): Promise<string | null> {
  const dev = devUser();
  return dev ? `Dev ${dev}` : null;
}

export const signedIn = () => devUser() !== null;

/** Google sign-in works once the client's Firebase config is in the build (VITE_FIREBASE_API_KEY). */
export const googleReady = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

export async function signInWithGoogle(): Promise<void> {
  // Firebase sign-in (same-tab redirect) plugs in here once the client's config arrives.
  throw new Error('Google sign-in isn’t ready yet. It’s coming soon.');
}

const ASKED_KEY = 'chesspage:login-asked';

/** The one-time sign-in prompt shows once per browser. */
export function loginAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return true;
  }
}

export function setLoginAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const a = await auth();
  const headers: Record<string, string> = {};
  if (a) headers.authorization = a;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const r = await fetch(`/api${path}`, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? 'Something went wrong.');
  return j as T;
}

export type Profile = { username: string | null; country: string | null };
export type BoardRow = { rank: number; username: string; country: string; played: number; solved: number; hinted: number; mistakes: number; timeMs: number };
export type Board = { date: string; country: string | null; players: number; rows: BoardRow[]; you: BoardRow | null };
