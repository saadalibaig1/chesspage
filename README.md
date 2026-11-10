# ChessPage

A daily chess puzzle game in the style of Wordle. Two modes:

- **Daily (default):** 6 levels, 1000 → 2000 rating, the same for everyone. Tap any level to play it, in any order; do one, a few or all six. The row above the board shows the puzzle's idea (e.g. Fork) and rating, and the tries: a ♟️ for each wrong move, a dot for each try left, a 👑 once solved. You get 5 tries on each level. A wrong move uses a try; the same wrong move again is free. Out of tries ends that level only and plays its solution (the full solution, Replay). Share: one row per played level, e.g. `ChessPage 12 · 3/4` then `1200 ♟️👑` (a pawn per wrong move, a crown for the solve). Each level has its own link with the date, e.g. `chesspage.com/2026/11/10/2`; the share-icon key copies it. A link always opens that level of today's Daily: an older date shows a short message and today's puzzle. The short form `/1` to `/6` also works.
- **Timer:** one 1600 puzzle a day, the same for everyone, against a 1-minute clock. The board stays blurred under a Start key until the clock starts; a reload resumes the clock. Share: `ChessPage Timer 12` / `⏱️ 0:38` (or `⏱️ X`).
- **Hint:** tap once to see which piece moves. Tap again to see where it goes. Hard Mode turns hints off and hides the idea until the level ends.
- Stats count the Daily levels: days played, average solved, streak of days with at least one level played. Progress is saved per browser, so chesspage.com is the one address: www and chesspage-theta.vercel.app redirect to it (`vercel.json`).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + data integrity tests
npm run build      # static site in dist/ (host anywhere)
npm run puzzles    # regenerate src/data/puzzles.json from the Lichess puzzle DB
```

- **Testing:** open Settings (⚙) and turn on **Test Mode**. The Daily tab then deals random ladders that never count toward stats. The "Test · New ladder" pill deals a fresh one.
- **Reset your day:** in devtools, run `localStorage.removeItem('chesspage:v3')`.
- **Saved data:** progress and stats are stored in the browser (localStorage). There is no backend.
- **Hosting:** a plain static site. Import the repo into Vercel, which detects Vite automatically, then add your domain in Project → Settings → Domains.
- **Docs:** see `docs/superpowers/specs/` for the spec and `DESIGN.md` for the design system.
- **Credits:** puzzles from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0). Pieces are cburnett (CC BY-SA 3.0).

## Leaderboards and accounts (sign-in hidden in production)

Design: [docs/superpowers/specs/2026-11-10-accounts-leaderboard-design.md](docs/superpowers/specs/2026-11-10-accounts-leaderboard-design.md).

- **Server:** Vercel Functions in `api/` (`day`, `play`, `timer`, `me`, `board`), logic in `server/`. The server checks every move with the same rules as the browser game. Signed-in routes need a Firebase token, so they do nothing until sign-in is set up.
- **Database:** Neon Postgres (`chesspage-db`, from the Vercel Marketplace). Tables are in `server/schema.sql`. Create or update them with `npm run db:migrate`.
- **Client:** the trophy (leaderboard) is always on. Everything that needs sign-in (the Account row in Settings, the sign-in prompt, signed-in play) shows only when the build has `VITE_SIGNIN=1`. Preview deployments set it; production doesn't, until the client says so.
- **Signed-in play:** the game still plays locally; `src/lib/ranked.ts` sends each open, move and hint to the server in order. The server judges them with the same rules. If a request fails or the answers differ, that level stops counting until it is opened again. Today's levels finished on another device show up after sign-in. Guests send nothing.
- **Known limits:** the puzzles and their solutions are still in the browser bundle, so a technical player could read them. The Timer's server time includes network delay.
- **Sign-in:** Firebase Google sign-in plugs into `auth()` in `src/lib/api.ts` and `identify()` in `server/auth.ts` (env `FIREBASE_PROJECT_ID`). Until then, dev builds have a test sign-in by name.

Run locally with the API:

```bash
ACCOUNTS_DEV_AUTH=1 vercel dev --listen 3000
```

Put `VITE_SIGNIN=1` in `.env.development.local`. Remove test users with `npm run db:clear-dev`.
