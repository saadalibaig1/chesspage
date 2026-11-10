import { route, signedIn } from '../server/http.js';
import { me, setProfile } from '../server/service.js';

/** GET /api/me: profile and history. POST /api/me { username?, country? }: update the profile. */
export const GET = route(({ repo, user }) => me(repo, signedIn(user)));
export const POST = route(({ repo, user, body }) => setProfile(repo, signedIn(user), body));
