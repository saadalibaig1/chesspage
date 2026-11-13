/** Sign-in (and everything that needs it) stays hidden unless the build sets VITE_SIGNIN=1. The leaderboard is always on. */
export const SIGNIN = import.meta.env.VITE_SIGNIN === '1';

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
  changed();
}

type Firebase = typeof import('./firebase');
let fb: Firebase | null = null;
let googleUser = false;
const listeners = new Set<() => void>();

/** Calls fn whenever someone signs in or out. Returns the unsubscribe. */
export function onAuthChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const changed = () => listeners.forEach((fn) => fn());

/** Loads Firebase at startup (only with VITE_SIGNIN), so it is ready before the sign-in tap. */
export function startAuth() {
  if (!SIGNIN || fb) return;
  import('./firebase').then((f) => {
    fb = f;
    f.watch((u) => {
      googleUser = !!u;
      changed();
    });
  });
}

/** The Authorization header for the signed-in player, or null for a guest. */
async function auth(): Promise<string | null> {
  const dev = devUser();
  if (dev) return `Dev ${dev}`;
  const t = googleUser && fb ? await fb.token() : null;
  return t ? `Bearer ${t}` : null;
}

export const signedIn = () => devUser() !== null || googleUser;

/** What to tell the player when Google sign-in fails. Empty when they closed Google's window themselves. */
export function signInError(code: string): string {
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/popup-blocked') return 'Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.';
  if (code === 'auth/unauthorized-domain') return 'Sign-in isn’t available on this address yet.';
  if (code === 'auth/network-request-failed') return 'No connection. Check your internet and try again.';
  return 'Sign-in didn’t work. Please try again.';
}

/** Opens Google's sign-in window. Throws with a message for the player, or an empty one if they closed it. */
export async function signInWithGoogle(): Promise<void> {
  if (!fb) throw new Error('Sign-in is still loading. Try again in a moment.');
  try {
    await fb.signIn();
  } catch (e) {
    throw new Error(signInError((e as { code?: string }).code ?? ''));
  }
}

export async function signOut() {
  if (devUser()) {
    setDevUser(null);
    return changed();
  }
  await fb?.signOut();
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
  // Anything but a JSON object (an outage page, a proxy error) counts as a failure, never as data.
  const j: unknown = await r.json().catch(() => null);
  if (!r.ok || !j || typeof j !== 'object') throw new Error((j as { error?: string } | null)?.error ?? 'Something went wrong.');
  return j as T;
}

export type Profile = { username: string | null; country: string | null };
export type BoardRow = { rank: number; username: string; country: string; played: number; solved: number; score: number; timeMs: number };
export type Board = { date: string; country: string | null; players: number; rows: BoardRow[]; you: BoardRow | null };
