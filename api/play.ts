import { route, signedIn } from '../server/http.js';
import { hint, HttpError, move, open } from '../server/service.js';

/** POST /api/play { action: 'open' | 'move' | 'hint', date, level, from?, to? } */
export const POST = route(({ repo, user, body }) => {
  const u = signedIn(user);
  const date = String(body.date ?? '');
  const level = Number(body.level);
  if (body.action === 'open') return open(repo, u, date, level);
  if (body.action === 'move') return move(repo, u, date, level, String(body.from ?? ''), String(body.to ?? ''));
  if (body.action === 'hint') return hint(repo, u, date, level);
  throw new HttpError(400, 'Unknown action.');
});
