import { route } from '../server/http.js';
import { day } from '../server/service.js';

/** GET /api/day?date=YYYY-MM-DD: today's levels without solutions. */
export const GET = route(({ url }) => day(url.searchParams.get('date') ?? ''));
