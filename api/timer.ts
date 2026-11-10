import { route, signedIn } from '../server/http.js';
import { HttpError, timerMove, timerStart } from '../server/service.js';

/** POST /api/timer { action: 'start' | 'move', date, from?, to? } */
export const POST = route(({ repo, user, body }) => {
  const u = signedIn(user);
  const date = String(body.date ?? '');
  if (body.action === 'start') return timerStart(repo, u, date);
  if (body.action === 'move') return timerMove(repo, u, date, String(body.from ?? ''), String(body.to ?? ''));
  throw new HttpError(400, 'Unknown action.');
});
