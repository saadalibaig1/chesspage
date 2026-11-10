import { currentUser } from './auth.js';
import { pgRepo } from './pg.js';
import { HttpError, type Repo, type User } from './service.js';

type Ctx = { req: Request; url: URL; repo: Repo; user: User | null; body: Record<string, unknown> };

/** Wraps an API route: JSON in and out, the user if signed in, and errors as { error }. Off unless ACCOUNTS=1. */
export function route(fn: (c: Ctx) => Promise<unknown> | unknown) {
  return async (req: Request): Promise<Response> => {
    if (process.env.ACCOUNTS !== '1') return Response.json({ error: 'Not found.' }, { status: 404 });
    try {
      const repo = pgRepo();
      const body = req.method === 'POST' ? ((await req.json().catch(() => ({}))) as Record<string, unknown>) : {};
      const user = await currentUser(req, repo);
      return Response.json(await fn({ req, url: new URL(req.url), repo, user, body }), { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: 'Something went wrong.' }, { status: 500 });
    }
  };
}

export function signedIn(user: User | null): User {
  if (!user) throw new HttpError(401, 'Sign in first.');
  return user;
}
