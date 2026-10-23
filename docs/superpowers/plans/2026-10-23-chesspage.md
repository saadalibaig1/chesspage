# ChessPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first, full-screen daily chess puzzle page: 5 Lichess puzzles a day, scoring, streaks, simulated country leaderboards, and a Wordle-style share.

**Architecture:** Static Vite SPA. Pure logic lives in `src/lib/*` (no React, unit-tested with Vitest). The UI in `src/components/*` and `src/App.tsx` composes it. A bundled `puzzles.json` is produced once by a Node script.

**Tech Stack:** Vite 5, React 18, TypeScript 5, chess.js 1.x, Vitest 2.

**Spec:** `docs/superpowers/specs/2026-10-23-chesspage-design.md`

## Global Constraints

- **Layout:** no page scroll at 390×844, 375×667, 844×390 or 1440×900. The app is `100dvh`, safe-area padded, `overscroll-behavior: none`.
- **Board:** `size = min(100vw, 100dvh − 40px − 48px, 720px)`, edge to edge on phones. Top bar 40px, bottom strip 48px.
- **Colours:** board `#769656` / `#eeeed2`. Last-move tint `rgba(255,255,0,.4)`. Dark ground ≈ `#262421`.
- **Assets:** no web fonts, no image or audio requests. Pieces are an inlined cburnett SVG sprite; sounds come from Web Audio. JS under 100 KB gzipped, excluding `puzzles.json`.
- **Motion:** transform/opacity only. Slide 120 ms (opponent 220 ms), select 80 ms, shake 200 ms, fill 150 ms, sheet 180 ms. All of it is removed under `prefers-reduced-motion`.
- **Storage:** `localStorage["chesspage:v1"]`, with every access in try/catch.
- **Days:** a day is the local date `YYYY-MM-DD`. `LAUNCH = "2026-10-23"` is day #1.
- **Test mode:** never writes history, streak or the leaderboard.
- **Leaderboard copy:** the leaderboard UI shows "Prototype: simulated data".

## Review Focus

1. **Tab reopened after midnight mid-session:** stale `progress.date` must be discarded and the new day started. Pinned in Task 5 (`loadProgress ignores other dates`).
2. **Alternative mate on the last move:** must be accepted as solved. Pinned in Task 3.
3. **Promotion moves in the solution (e.g. `e7e8q`):** dragging to the promotion square must match. Pinned in Task 3.
4. **Storage throwing (Safari private mode):** the game still plays. Pinned in Task 5 (`load returns default when localStorage throws`).
5. **Unknown timezone / no locale region:** falls back to `"WW"` ("Worldwide"), and the flag renders as 🌍. Pinned in Task 6.

---

### Task 1: Scaffold, shell meta, puzzle data

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/styles.css`, `public/manifest.webmanifest`, `public/icon.svg`
- Create: `scripts/build-puzzles.mjs`, `src/data/puzzles.json`

**Interfaces:**
- Produces: `puzzles.json` = `[[id, fen, moves, rating], ...][]`. These are 5 band arrays, each with 365 entries in the order fetched. `moves` is a space-separated UCI string.

- [ ] **Step 1:** Scaffold with `npm create vite@latest . -- --template react-ts`, then `npm i chess.js` and `npm i -D vitest`. Add `"test": "vitest run"`.
- [ ] **Step 2:** Set up `index.html`:
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  - `theme-color` metas for light and dark
  - link `manifest.webmanifest` (`display: standalone`)
  - title "ChessPage: daily chess puzzles"
- [ ] **Step 3:** Write `scripts/build-puzzles.mjs`. It fetches pages from `https://datasets-server.huggingface.co/rows?dataset=Lichess/chess-puzzles&config=default&split=train&offset=<random>&length=100` and keeps rows that meet all of these:
  - `Popularity ≥ 90`
  - `NbPlays ≥ 1000`
  - `Moves` has ≤ 6 plies (so ≤ 3 player moves)
  - `Rating` falls inside a band: `[700,1000)`, `[1000,1300)`, `[1300,1600)`, `[1600,1900)`, `[1900,2200)`

  It stops when every band has 365, dedupes by id, and throttles to about 5 requests/s with retry on 429/5xx.
- [ ] **Step 4:** Run `node scripts/build-puzzles.mjs`. Expected: `src/data/puzzles.json` with 5×365 entries, ≤ 250 KB.
- [ ] **Step 5:** `npm run build` succeeds.

### Task 2: Daily selection (`src/lib/daily.ts`)

**Interfaces:**
- Produces:
  - `type Puzzle = { id: string; fen: string; moves: string[]; rating: number; band: number }`
  - `type Pool = [string, string, string, number][][]`
  - `LAUNCH = "2026-10-23"`
  - `BAND_NAMES = ["Warm-up","Easy","Medium","Tricky","Hard"]`
  - `localDateKey(d?: Date): string`
  - `dayNumber(key: string): number` (launch day = 1)
  - `dailySet(key: string, pool: Pool): Puzzle[]`
  - `randomSet(pool: Pool, rand?: () => number): Puzzle[]`
  - `msUntilMidnight(now?: Date): number`

- [ ] **Step 1: Tests** (`src/lib/daily.test.ts`):
  - `localDateKey(new Date(2026,9,23,23,59)) === "2026-10-23"`
  - `dayNumber("2026-10-23") === 1` and `dayNumber("2026-10-24") === 2`
  - `dailySet` is deterministic for the same key
  - over 365 consecutive days each band's ids are all unique
  - `set[b].band === b`
  - `msUntilMidnight(new Date(2026,9,23,23,0)) === 3_600_000`
- [ ] **Step 2:** Run `npx vitest run src/lib/daily.test.ts`. Expected: it fails.
- [ ] **Step 3:** Implement. Index = `((day-1) * STRIDE[b] + OFFSET[b]) mod len`, with `STRIDE = [7,11,13,17,19]` (coprime with 365 = 5·73: no 5 or 73) and `OFFSET = [0,50,100,150,200]`. Use a positive mod for days before launch. Day difference is computed via `Date.UTC` of the date parts, so DST doesn't break it.
- [ ] **Step 4:** Tests pass.

### Task 3: Puzzle state machine (`src/lib/puzzle.ts`)

**Interfaces:**
- Consumes: `Puzzle` (Task 2).
- Produces:
  - `type Sq = string`
  - `type LastMove = { from: Sq; to: Sq; san: string; by: "w" | "b" }`
  - `type TryResult = "correct" | "solved" | "wrong" | "illegal"`
  - `class PuzzleRun`:
    - `constructor(p: Puzzle)` plays `moves[0]` (the opponent's move) and sets `lastMove`
    - `readonly player: "w" | "b"`
    - `fen(): string`
    - `board(): ({ type: string; color: "w" | "b" } | null)[][]` (chess.js `board()`)
    - `lastMove: LastMove | null`
    - `status: "playing" | "solved" | "revealed"`
    - `step: number` (player moves done)
    - `totalSteps: number`
    - `targets(from: Sq): Sq[]`
    - `needsPromotion(from: Sq, to: Sq): boolean`
    - `tryMove(from: Sq, to: Sq): TryResult` (does not auto-play the reply)
    - `reply(): LastMove | null` (plays the opponent's next solution move if one is pending)
    - `hint(): Sq` (the from-square of the expected move)
    - `reveal(): LastMove[]` (plays all remaining moves and sets status `"revealed"`)
    - `inCheck(): boolean`

- [ ] **Step 1: Tests** using fixture `{ id:"00008", fen:"r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24", moves:"f2g3 e6e7 b2b1 b3c1 b1c1 h6c1".split(" "), rating:1811, band:3 }`:
  - after construct `player === "w"`, `lastMove.from === "f2"`, `totalSteps === 3`
  - `tryMove("e6","e5") === "wrong"` and the FEN is unchanged
  - `tryMove("e6","e7") === "correct"`, then `reply().from === "b2"`
  - playing through all three returns `"solved"`, with `status === "solved"`
  - `reveal()` from the start returns 5 moves with `status === "revealed"`
  - alternative mate: a fixture mate-in-1 puzzle where another mate exists returns `"solved"` for the alternative
  - promotion: a fixture whose solution has `x7x8q` matches when the UI passes from/to only
  - `hint()` returns the expected from-square
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3:** Implement on chess.js.
  - A move matches when its UCI equals the expected one. The promotion piece is taken from the expected move whenever from/to match.
  - On the final step, any move that results in checkmate also counts.
  - A non-matching legal move returns `"wrong"` and doesn't change the position. A non-legal one returns `"illegal"`.
- [ ] **Step 4:** Tests pass.

### Task 4: Scoring and share (`src/lib/scoring.ts`, `src/lib/share.ts`)

**Interfaces:**
- Produces:
  - `type Outcome = "clean" | "messy" | "revealed"`
  - `type PuzzleResult = { band: number; timeMs: number; mistakes: number; hinted: boolean; revealed: boolean }`
  - `puzzlePoints(r: PuzzleResult): number`
  - `outcomeOf(r: PuzzleResult): Outcome`
  - `streakMultiplier(streak: number): number`
  - `dayScore(results: PuzzleResult[], streak: number): number`
  - `shareText(o: { day: number; streak: number; outcomes: Outcome[]; timeMs: number; score: number }): string`
  - `formatTime(ms: number): string` (`"m:ss"`)

- [ ] **Step 1: Tests:**
  - `puzzlePoints({band:0,timeMs:5000,mistakes:0,hinted:false,revealed:false}) === 150`
  - `{band:0,timeMs:35000}` gives `125`
  - `{band:4,timeMs:90000}` gives `500`
  - `{band:2,timeMs:60000,mistakes:2}` gives `180`
  - `{band:2,timeMs:60000,hinted:true}` gives `210`
  - `{band:0,timeMs:60000,mistakes:9}` gives `10` (floor)
  - revealed gives `0`
  - `streakMultiplier(1)===1`, `(3)===1.1`, `(21)===2`, `(40)===2`
  - `dayScore` rounds to an integer
  - `outcomeOf`: mistakes or a hint gives `"messy"`
  - `shareText({day:1,streak:3,outcomes:["clean","clean","messy","clean","revealed"],timeMs:167000,score:2480})` equals `"ChessPage #1 🔥3\n🟩🟩🟨🟩🟥\n4/5 · 2:47 · 2,480 pts"`
- [ ] **Step 2:** Fail. **Step 3:** Implement per spec §5 and §10. **Step 4:** Pass.

### Task 5: Storage and streak (`src/lib/storage.ts`)

**Interfaces:**
- Consumes: `PuzzleResult`, `Outcome`.
- Produces:
  - `type DayResult = { score: number; timeMs: number; outcomes: Outcome[]; streak: number }`
  - `type Settings = { hints: boolean; sound: boolean; coords: boolean; testMode: boolean }`
  - `type Progress = { date: string; index: number; results: PuzzleResult[] }`
  - `type Store = { introSeen: boolean; country?: string; settings: Settings; history: Record<string, DayResult>; progress?: Progress }`
  - `load(): Store`
  - `save(s: Store): void`
  - `loadProgress(s: Store, today: string): Progress`
  - `streakBefore(history, today: string): number` (the chain ending yesterday)
  - `currentStreak(history, today: string): number` (the chain ending today, or yesterday when today is unplayed)
  - `DEFAULT_SETTINGS = { hints: true, sound: true, coords: true, testMode: false }`

- [ ] **Step 1: Tests** (stub `localStorage` with a Map):
  - round-trip save/load
  - `load returns default when localStorage throws`
  - `loadProgress ignores other dates` (returns `{date:today,index:0,results:[]}`)
  - with history `{"2026-10-21","2026-10-22"}` and today `"2026-10-23"`: `streakBefore === 2` and `currentStreak === 2`
  - after adding 10-23: `currentStreak === 3`
  - with a gap (10-20, 10-22): `currentStreak("2026-10-23") === 1`
- [ ] **Steps 2–4:** fail → implement → pass.

### Task 6: Country and simulated leaderboard (`src/lib/country.ts`, `src/lib/leaderboard.ts`)

**Interfaces:**
- Produces:
  - `detectCountry(tz?: string, lang?: string): string` (ISO2 or `"WW"`)
  - `flag(iso: string): string`
  - `countryName(iso: string): string` (Intl.DisplayNames, with `"WW"` → `"Worldwide"`)
  - `COUNTRIES: string[]` (about 30 ISO codes)
  - `type Row = { iso: string; players: number; topScore: number; fastestMs: number; longestStreak: number; you?: boolean }`
  - `type Metric = "score" | "time" | "streak"`
  - `simulatedRows(date: string): Row[]`
  - `withPlayer(rows: Row[], iso: string, r: DayResult | null): Row[]`
  - `ranked(rows: Row[], m: Metric): Row[]`

- [ ] **Step 1: Tests:**
  - `detectCountry("Asia/Karachi") === "PK"`
  - `detectCountry("America/New_York") === "US"`
  - `detectCountry("Mars/Base","en") === "WW"`
  - `detectCountry("Mars/Base","fr-CA") === "CA"`
  - `flag("PK") === "🇵🇰"` and `flag("WW") === "🌍"`
  - `simulatedRows` is stable for the same date and differs across dates
  - `withPlayer` with a higher score replaces the country's `topScore`, sets `you`, and increments `players`
  - an iso missing from `COUNTRIES` is appended
  - `ranked(rows,"time")` sorts ascending; the others sort descending
- [ ] **Steps 2–4:** fail → implement (mulberry32 seeded by a string hash) → pass.
  - Value ranges: players 50–5000 scaled by a per-country weight, topScore 2200–4800, fastest 70–200 s, streak 20–400.

### Task 7: Sound and haptics (`src/lib/sound.ts`)

**Interfaces:**
- Produces:
  - `type Sfx = "move" | "capture" | "check" | "wrong" | "solved" | "complete"`
  - `play(s: Sfx): void`
  - `setSoundEnabled(on: boolean): void`
  - `buzz(p: number | number[]): void`

- [ ] **Step 1:** Implement a lazy AudioContext created on first `play()`. Each sfx is 1–4 short oscillator/noise envelopes at gain ≈ 0.12 and under 400 ms:
  - move: a filtered noise tick at 1.8 kHz, 40 ms
  - capture: a lower tick at 900 Hz, 70 ms
  - check: 880→660 Hz blips
  - wrong: a 140 Hz sine thud, 120 ms
  - solved: 660→990 Hz
  - complete: 523/659/784/1047 Hz arpeggio
  - `buzz` calls `navigator.vibrate` if it exists.

  There's no unit test (it's audio). It gets verified by ear in Task 10.

### Task 8: Board (`src/components/Board.tsx`, `src/components/pieces.tsx`, `src/components/board.css`)

**Interfaces:**
- Consumes: `PuzzleRun` (Task 3).
- Produces: `<Board run={PuzzleRun} version={number} orientation="w"|"b" coords={boolean} hintSq={Sq|null} shake={Sq|null} interactive={boolean} onMove={(from: Sq, to: Sq) => void} />`.
  - `version` bumps to re-render after a move.
  - `pieces.tsx` exports `<PieceSprite/>` (inline `<svg><defs>` holding the 12 cburnett `<symbol id="wK">…`) and `<Piece code="wK"/>` (`<svg><use href="#wK"/></svg>`).

- [ ] **Step 1:** Build the cburnett sprite from the 12 SVGs, using the paths from the lichess-org/lila `public/piece/cburnett` set (CC BY-SA 3.0).
- [ ] **Step 2:** Render the board as a CSS grid 8×8 of `<button>`s, each with an `aria-label` like `"e4, white knight"`.
  - Square highlights:
    - last move from/to and the selected square: tint
    - targets: a dot, or a ring for captures
    - hint square: a pulsing outline
  - Coordinates sit inside the edge squares.
- [ ] **Step 3:** Input:
  - `pointerdown` selects or moves.
  - Dragging moves a floating piece via `transform`, and on `pointerup` the drop square is found from the board rect.
  - Arrow keys move the focus and Enter/Space acts as a click.
- [ ] **Step 4:** Animate pieces. A moved piece slides from the old square with a FLIP transform: 120 ms for the player, 220 ms when `lastMove.by !== orientation`. A wrong move shakes for 200 ms via a `.shake` class.

### Task 9: App shell and flow (`src/App.tsx`, `src/components/TopBar.tsx`, `src/components/BottomStrip.tsx`, `src/styles.css`)

**Interfaces:**
- Consumes: everything above.
- Produces: the playable day, with test mode and persistence.

- [ ] **Step 1:** Write `styles.css`:
  - tokens on `:root` for light and dark
  - `html, body, #root { height: 100%; overflow: hidden; overscroll-behavior: none }`
  - `.app` is a grid `40px 1fr 48px` at `100dvh`, with `env(safe-area-inset-*)` padding
  - `--board: min(100vw, calc(100dvh - 88px - safe insets), 720px)`
  - a landscape media query `(orientation: landscape) and (max-height: 500px)` moves the bars into side columns
- [ ] **Step 2:** Build the TopBar:
  - 5 segments (outcome colours plus a word in `aria-label`) and "3/5 · Medium"
  - in test mode, a "TEST · New set" chip
  - the hamburger button
- [ ] **Step 3:** Build the BottomStrip:
  - a side-to-move disc and the status text, e.g. "Black played Qxe4 · your move", "✗ Not quite" or "✓ Good move"
  - step pips
  - 💡 (when hints are on) and "Show me", or the green "Next →" button
- [ ] **Step 4:** Wire the flow in App:
  1. Load the store, then today's set (or the test set).
  2. If `history[today]` exists and test mode is off, show the done state: the board read-only at the last puzzle's final position, and the bottom strip showing "Done for today · next in hh:mm:ss" with a "Results" button.
  3. On a correct move: `play`, then after 220 ms `reply()`.
  4. On wrong: mistakes++, shake, `play("wrong")`, `buzz([30,0,30])`.
  5. Time per puzzle comes from `performance.now()` with pauses on `visibilitychange`.
  6. After puzzle 5 completes, write `history[today]` (score with `streakBefore+1`) unless test mode is on, then open the Success modal.
  7. Save `progress` after every puzzle.

### Task 10: Modals, menu, verification

**Files:** `src/components/Sheet.tsx` (shared modal / bottom sheet), `IntroModal.tsx`, `SuccessModal.tsx`, `LeaderboardModal.tsx`, `Menu.tsx` (with Stats and Settings sections).

- [ ] **Step 1:** Build `Sheet`:
  - a `<dialog>`-like overlay: `role="dialog"`, `aria-modal`, focus trap, Esc to close, focus restored on close
  - a bottom sheet under 600px wide, a centered card above that
  - a 180 ms slide-in
- [ ] **Step 2:** Build the Intro ("Solve today's 5", three rules, Play), shown when `!introSeen`.
- [ ] **Step 3:** Build Success:
  - "Brilliant!" plus confetti (24 CSS spans, reduced-motion off)
  - tiles: Score / Time / Streak
  - the emoji grid
  - Copy result (`navigator.clipboard.writeText`, with a textarea fallback), "Copied!" for 1.5 s
  - the countdown
  - "See leaderboard"
- [ ] **Step 4:** Build the Leaderboard: tabs Score/Time/Streak, ranked rows (rank, flag, name, value, players), "You" highlighted, a country select, and the "Prototype: simulated data" note.
- [ ] **Step 5:** Build the Menu:
  - How to play, Leaderboard, Statistics (played, current/best streak, best score, last 7 days bars)
  - Settings switches: Hints, Sound, Show coordinates, Test mode
  - the credits line
- [ ] **Step 6:** Verify:
  - `npm test` all green, and `npm run build` with JS gzip under 100 KB
  - in the browser at 390×844, 375×667, 844×390 and 1440×900: play a full day, reload mid-session, reload when done (locked), test mode New set, Show me, hints off, keyboard play, both themes, and no scroll anywhere
  - run `.claude/skills/impeccable/scripts/impeccable detect --json src` and fix what's mechanical
  - a web-interface-guidelines pass
