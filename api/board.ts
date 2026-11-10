import { route } from '../server/http.js';
import { board } from '../server/service.js';

/** GET /api/board?date=YYYY-MM-DD&country=PK (no country = World). Guests can view it. */
export const GET = route(({ repo, user, url }) => board(repo, url.searchParams.get('date') ?? '', url.searchParams.get('country') || null, user));
