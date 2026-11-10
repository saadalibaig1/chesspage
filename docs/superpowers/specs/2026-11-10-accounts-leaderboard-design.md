# Accounts, server checks and country leaderboards: design

Status: draft, for review. Nothing here is built yet.

## Goal

Players can sign in with Google (optional), pick a username and a country, and appear on a daily leaderboard for their country. The server checks every move, so scores can't be faked. Guests keep playing exactly as they do today.

## Rules that don't change

- Login is always optional. A guest sees the same game as today.
- No past puzzles. The server serves only the current day.
- The day stays each player's own local day, as now. Puzzle #N is the same for everyone.
- The Daily and Timer rules, the share text and the level links stay the same.
- No ads, no tracking, no third-party analytics.

## Parts

### 1. Login (Firebase Authentication, client's account)

- Our own sheet: "Save your streak and join your country's leaderboard", one **Sign in with Google** key and **Not now**.
- When it shows: once, after the player finishes their first level (solved or not). Never on the first visit, because the Help sheet shows then. **Not now** hides it for good. A **Sign in** row in Settings is always there.
- Google's page opens in the same tab, and the player comes back to the same level.
- The client sends us the Firebase web config. It isn't secret. Until it arrives, every login part stays hidden.
- Later (optional): a Vercel rewrite of `/__/auth/*` plus one redirect address in the client's Google account, so Google's page shows chesspage.com. This also makes login work reliably in Safari.

### 2. Username and country

- After the first sign-in, a sheet asks for a username and a country.
- Username: 3–15 characters, letters, numbers and `_`, unique (case doesn't matter), with a short blocked-word list. It can be changed in Settings.
- Country: a list with flags. The first guess comes from Vercel's country header (`x-vercel-ip-country`), so no third party is involved. It can be changed at any time in Settings. A change applies from the next day, so a player can't move between boards during a day.

### 3. Server (Vercel Functions in `/api`, Node)

The puzzle data moves to the server for signed-in play. The selection math (`dailyLadder`, `dailyTimer`) stays the same, so everyone still gets the same puzzles.

| Endpoint | Does |
|---|---|
| `GET /api/day?date=YYYY-MM-DD` | Today's 6 levels plus the Timer puzzle: position and the opponent's first move only, no solutions. Refuses dates outside the allowed window. |
| `POST /api/move` | `{date, level, line}`. The server replays the line and answers `correct` with the reply move, `wrong`, `repeat` or `solved`. It counts wrong moves itself. |
| `POST /api/hint` | Returns the hint and marks the level as hinted. |
| `POST /api/timer/start`, `POST /api/timer/move` | The server starts the clock and measures the time. |
| `GET/POST /api/me` | Username, country and synced history. |
| `GET /api/board?country=PK&date=…` | The top 50 for that country and day, plus your own rank. |

- **Allowed date window:** the server's UTC date ±1 day. This covers every time zone and blocks old days. A player in UTC+14 can open the next puzzle about 14 hours before London, but they play it like everyone else, so this gives them no advantage.
- **Auth check:** each signed-in request carries the Firebase ID token. The server checks it against Google's public keys (`jose`), with issuer `https://securetoken.google.com/<projectId>`. No secret key from the client is needed.
- **Guests:** they keep the local game and send nothing to the server, so offline play still works.

### 4. Database (Postgres from the Vercel Marketplace, e.g. Neon free tier, in our Vercel account)

- `users`: id, firebase_uid (unique), username (unique, case-insensitive), country, country_from (date), created_at
- `plays`: user_id, date, level, mistakes, hinted, failed, tried (moves), time_ms, done. Primary key (user_id, date, level).
- `timer_plays`: user_id, date, started_at, solved, time_ms. Primary key (user_id, date).

We store only the Google user id, display name and email. No passwords.

### 5. Leaderboard

- A new icon in the header opens it. Tabs: your country, and World.
- **Today:** ranked by levels solved, then fewer wrong moves, then less total time. Hinted levels count as solved but rank below unhinted ones with the same totals.
- Each row shows rank, flag, username, levels solved (for example 4/6) and the share-style row.
- Guests can view the boards. To appear on them, a player must sign in.
- Timer gets its own board (fastest solve) in a later step.

### 6. Stats sync

- At the first sign-in, the local history uploads once. It counts for the player's own stats and streak, but not for any leaderboard, because the server didn't check it.
- After that, the server keeps the history, so streaks carry across devices.

## Limits

- Server checks stop fake scores, but they don't stop a player from using a chess engine.
- Signed-in play needs a connection. Guests can still play offline.

## Build order

1. **Now, no client input needed:** database, API, server move checks, country picker and leaderboard screens. All of it stays hidden behind a flag in production.
2. **When the Firebase config arrives:** login sheet, username sheet, turn the flag on.
3. **Later:** Timer board, and the chesspage.com sign-in address.

## Decisions needed

1. **Database:** OK to create a free Neon Postgres in our Vercel account? The client can take it over later.
2. **Login sheet timing:** after the first finished level, as above?
3. **Leaderboard scope:** Today only (recommended), or also This week and All time?
4. **Hinted levels:** do they rank below unhinted ones (recommended), or is a hint not counted at all?
