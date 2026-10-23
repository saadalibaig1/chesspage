# ChessPage: design spec

Date: 2026-10-23 · Status: awaiting review

## 1. Intent

A Wordle-style daily chess puzzle page. Once a day, everyone gets the same 5 puzzles, rising in difficulty, each solvable in under a minute. Play takes about 5 minutes and can happen only once per day. You finish with a plain-text emoji result to paste into Slack and the like. Country leaderboards report the day's top score, fastest time and longest streak per country.

**What the user said:** frontend prototype first; 5 fixed puzzles of increasing difficulty; score combines time and streak; wrong moves cost points but never auto-reveal, plus a separate reveal button; country-only leaderboards (no individual stats, no SSO in v1); Vite + React + TS; Wordle-style text/emoji share; a plain, simple chess.com-like interface; a board that fits on screen without scrolling on web and mobile; classic solid white/black pieces; a test toggle to generate a new puzzle set. Client follow-up: the board is about 90% of the screen with almost no controls; a hamburger menu (top right) holds settings, including hints on/off; show which move of the solution you're on; indicate the opponent's last move.

**Assumptions (correct me):**
- A "day" is the player's **local** calendar day, as in Wordle.
- Test-mode runs never touch streak, history or leaderboard. The test toggle moves into the hamburger menu, and a small chip at the top-left appears when it's on.
- Leaderboard data is **simulated** and labeled as such in the UI.

**Success:** a first-time visitor understands the game from the intro popup, solves 5 puzzles with no scrolling on a phone, gets a congratulation popup with a copyable result, sees their country on the leaderboard, and is locked out until tomorrow, all of which survives a page reload.

## 2. Stack and structure

Vite + React 18 + TypeScript, plain CSS with custom-property tokens, `chess.js` for move legality, Vitest for logic tests. No router or state library: one page plus modals.

```
scripts/build-puzzles.mjs   one-off: fetch + curate puzzles → src/data/puzzles.json
src/data/puzzles.json       bundled pool (generated, committed)
src/lib/daily.ts            date → day number, day → 5 puzzles (deterministic, no repeats)
src/lib/puzzle.ts           puzzle state machine on top of chess.js (pure, testable)
src/lib/scoring.ts          per-puzzle points, streak multiplier, day total
src/lib/storage.ts          localStorage load/save, streak calc, history
src/lib/country.ts          timezone → ISO country, flag emoji, names
src/lib/leaderboard.ts      seeded simulated country stats + merge player's result
src/lib/share.ts            Wordle-style share text
src/components/Board.tsx    8×8 board, pieces, click/drag/keyboard input, highlights
src/components/*Modal.tsx   Intro, Success, Leaderboard (one shared <Modal> shell)
src/App.tsx                 page layout and game flow
public/pieces/*.svg         cburnett piece set (CC BY-SA 3.0, credited in footer)
```

Each `lib/` module is pure and has no React dependency, so the logic is unit-testable on its own.

## 3. Puzzles

- **Source:** the Lichess open puzzle database (CC0), via the Hugging Face dataset `Lichess/chess-puzzles`. The build script pages rows, filters them, and writes a compact JSON of `[id, fen, moves, rating]`.
- **Curation:** five rating bands: Warm-up ≈700–1000, Easy 1000–1300, Medium 1300–1600, Tricky 1600–1900, Hard 1900–2200. Kept puzzles have `Popularity ≥ 90`, `NbPlays ≥ 1000` and a solution of at most 3 player moves, so each is solvable in under a minute. 365 puzzles per band gives a year of unique days (≈1,825 puzzles, ~60 KB gzipped).
- **Daily pick:** `day = days since 2026-10-23 (local)`. Puzzle *b* of the day is `band[b][(day * stride_b + offset_b) mod 365]`, using a fixed coprime stride per band. That makes it deterministic, identical for everyone, and repeat-free for 365 days.
- **Lichess format:** the FEN is the position *before* the opponent's move. The first UCI move is auto-played with a short animation, and the player then has the side to move. The board is oriented with the player's colour at the bottom.

## 4. Gameplay rules

- **Correct move:** the move is applied and the opponent's reply auto-plays after ~400 ms. On the last move, any checkmating move is accepted (Lichess rule).
- **Wrong move:** the board shakes, the piece snaps back, the move doesn't count, and a mistake is recorded. A visible "✗ Not quite" message appears, so colour isn't the only signal.
- **Hint** (only when Hints is on in Settings): highlights the piece to move. Costs points. One per move.
- **Show me:** plays the rest of the solution, marks the puzzle *revealed* (0 points), then offers "Next puzzle". It never fires automatically.
- **Promotion:** uses the solution's piece when the move matches, otherwise a queen.
- **Input:** click-to-move with legal-move dots, drag with pointer events (mouse and touch), and keyboard (arrow keys move a focus ring, Enter/Space selects). Squares have `aria-label`s such as "e4, white knight".
- **No time limit.** A hidden timer runs per puzzle and pauses while the tab is hidden.

## 5. Scoring

Per puzzle: `base = [100, 200, 300, 400, 500][band]`.

- Time bonus: `+50% base` if solved in ≤10 s, falling linearly to `+0` at 60 s and beyond.
- Each mistake costs `−20% base`; a hint costs `−30% base`. The floor is `10% base` for any solve.
- Revealed: `0`.

Day total = sum of the 5 puzzles × **streak multiplier**, where `1 + 0.05 × (streak − 1)`, capped at `2.0×`. The streak includes today.

Example: five clean, fast solves on day 1 ≈ 2,250. The same run on a 21-day streak ≈ 4,500.

## 6. Session, streak and lock

`localStorage["chesspage:v1"]` holds:

```ts
{ introSeen: boolean,
  country?: string,                       // user override
  history: Record<"YYYY-MM-DD", DayResult>,
  progress?: { date, index, results[] } } // mid-session resume
DayResult = { score, timeMs, results: ("clean"|"messy"|"revealed")[], streak }
```

- **Streak:** the count of consecutive dates in `history` ending today, or yesterday if today isn't played yet. Missing a day resets it.
- **Lock:** if `history[today]` exists, the page opens in the *done* state: results, share, countdown to local midnight, leaderboard. The board shows the final position of puzzle 5 and can't be played.
- **Reload mid-session** resumes at the current puzzle. The puzzle in progress restarts from its beginning, and solved puzzles keep their results.
- **Storage failures** (private mode, blocked storage) are wrapped in try/catch. The game still plays and simply won't persist.

## 7. Test mode (in the menu)

Test mode is a switch in the hamburger menu's Settings. While it's on, a small "TEST · New set" chip sits at the top-left of the top bar. Tapping it deals a random 5-puzzle set (one per band, random indices) and bypasses the daily lock. Test results go to neither history, streak nor leaderboard. Switching it off returns to today's real state.

## 8. Country and leaderboard (simulated)

- **Country:** `Intl.DateTimeFormat().resolvedOptions().timeZone` maps to ISO country through a bundled table of the common ~150 timezones. Fallback is the region from `navigator.language`, then "Worldwide". The player can change it from a select in the leaderboard. A flag emoji comes from the ISO code.
- **Data:** about 30 countries. For each one, a seeded PRNG keyed on `date + country` produces players today, top score, fastest time and longest streak, stable for the whole day. The player's finished result merges into their country: their country's figure takes the player's value whenever the player beats it.
- **UI:** a leaderboard modal with three tabs (**Score**, **Time**, **Streak**) of ranked country rows: rank, flag, name, value, players. The player's country is highlighted with "You". A visible footnote says "Prototype: simulated data". Before completion the player can still open it to see today's standings.

## 9. Interface

Client direction: **the board is about 90% of the screen, with almost no controls.** The chess.com category standard, plain and simple.

- **Layout:** the whole viewport, one column, no scrolling at 375×667 and above.
  1. **Top bar (40px):** on the left, the puzzle progress: five thin segments (filled 🟩/🟨/🟥 as you go, the current one outlined) plus "3/5 · Medium". On the right, a hamburger. In test mode a "TEST · New set" chip sits at the far left.
  2. **Board:** `size = min(100vw, 100dvh − 40px − 48px, 720px)`. Edge to edge on phones, with no side gutter, and centered on desktop. Coordinates sit inside the edge squares, as chess.com does.
  3. **Bottom strip (48px):** on the left, a side-to-move disc (white or black) plus the status line. On the right, the move pips and the controls.
     - The status line shows "Black played Qxe4 · your move", flashes "✗ Not quite" (red) or "✓ Good move" (green), and always uses a word as well as colour.
     - The **move pips** read "● ● ○" for move 2 of 3. There's one pip per player move in the solution, and they fill as you go.
     - The controls are a 💡 icon button (only when Hints is on) and a quiet "Show me" text button. After a puzzle ends, both are replaced by a single green **Next →** button.
- **Opponent's last move:** both squares get the yellow tint chess.com uses (`rgba(255,255,0,.4)` over the square), and the piece slides 250 ms so you see it happen. The status line names the move in SAN. Your selected piece gets the same tint, and legal targets show as dots or rings.
- **Hamburger menu:** a right-side drawer on desktop, a bottom sheet on phones. Items:
  - How to play (opens Intro)
  - Leaderboard
  - Statistics (played, streak, best score, last 7 days)
  - Settings: **Hints** on/off (default on; when off there's no 💡 and no hint penalty), **Sound** on/off, **Show coordinates** on/off, **Test mode** on/off
  - Credits line: puzzles from Lichess (CC0), pieces cburnett (CC BY-SA 3.0)
- **Timer:** it isn't shown during play, which keeps the screen calm and fits "no time limit". It's measured in the background and shown on the success popup and in the share.
- **Theme:** light and dark through `prefers-color-scheme`. Dark is a charcoal ground (`#262421`-ish); light is a near-white neutral. The board is the familiar green/buff (`#769656` / `#eeeed2`). The primary button is a chunky green with a pressed bottom edge, Duolingo-style. Text uses the system UI stack, with tabular numbers.
- **Pieces:** the cburnett SVG set: solid white pieces with dark outlines, and solid black pieces.
- **Modals:** a centered card with a dimmed backdrop. Esc closes it, focus is trapped and restored, and it becomes a bottom sheet on phones.
  - **Intro** (first visit, and "How to play"): "Solve today's 5", three short rules with icons, and a "Play" button.
  - **Success:** "Brilliant!" plus a CSS confetti burst (skipped with reduced motion), score / time / streak tiles, the emoji grid, **Copy result** ("Copied!" feedback), countdown to the next set, and a "See leaderboard" link.
- **Motion:** piece slides, the wrong-move shake and the confetti, all disabled under `prefers-reduced-motion`.

## 9b. Mobile web, speed, motion and sound

Client direction: **an amazing mobile web: full screen, no scrolling, very fast and responsive, with fast, subtle animations and sounds.** Mobile is the primary design target; desktop is the same layout centered.

- **Full screen:**
  - The app is `100dvh` with `viewport-fit=cover`, and safe-area insets pad the top bar and bottom strip so they clear notches and the home indicator.
  - `overscroll-behavior: none`, no body scroll, and `touch-action: none` on the board, so drags never scroll or zoom the page.
  - Double-tap zoom is disabled on controls.
  - `theme-color` matches the bar in both themes.
  - A minimal web manifest (`display: standalone`, icon) lets "Add to Home Screen" open full screen with no browser chrome.
- **Fast:**
  - No web fonts (system stack). The 12 piece SVGs are inlined as one sprite, so there are no image requests and no flash.
  - Puzzles are one JSON, code-split from the shell and prefetched.
  - Target: under 100 KB of JS gzipped and an interactive board under 1 s on a mid-range phone over 4G.
  - Input is handled on `pointerdown`, so a tap selects instantly with no 300 ms delay.
  - The board renders with CSS grid and transforms. A move re-renders only the squares that changed.
- **Motion:** transform/opacity only, and short:
  - Piece slide 120 ms (opponent reply 220 ms so it can be followed), ease-out.
  - Selection tint fades in at 80 ms.
  - Wrong move: a 200 ms 3-shake of the piece, then it snaps back.
  - Progress segment fills over 150 ms.
  - Sheets and menu slide in at 180 ms.
  - Confetti only on day complete.
  - With `prefers-reduced-motion`, slides become instant and the shake and confetti are removed.
- **Sound:** synthesized with the Web Audio API, so there are no audio files and no licensing, and it plays instantly. The AudioContext is created on the first tap.
  - Sounds: move (soft wooden tick), capture (slightly fuller knock), check (two-tone blip), wrong (low muted thud), puzzle solved (short rising two-note chime), day complete (four-note arpeggio).
  - All are quiet (−18 dB-ish) and under 400 ms.
  - Settings → **Sound** on/off, default on, remembered.
- **Haptics:** where `navigator.vibrate` exists (Android), a 10 ms tick on move and a 30-0-30 pattern on wrong. iOS Safari ignores it silently.
- **Orientation:** portrait-first. In landscape phones the board takes the full height and the top bar and bottom strip move to side columns, so it still never scrolls.

## 10. Share text

```
ChessPage #1 🔥3
🟩🟩🟨🟩🟥
4/5 · 2:47 · 2,480 pts
```

🟩 means solved clean, 🟨 solved with a mistake or hint, 🟥 revealed. The share is copied with `navigator.clipboard`, falling back to a selectable textarea.

## 11. Testing

- **Vitest unit tests:** daily selection (deterministic, no repeats over 365 days), the puzzle state machine (opponent first move, correct/wrong moves, alternative mates, reveal, promotion), scoring, streak calculation across gaps, share text, timezone→country, and leaderboard merge.
- **Browser check:** play a full day end to end at 390×844 (primary), 375×667, landscape 844×390 and 1440×900, confirm there's no scroll at any of them, check the bundle size, test the lock after reload, test mode, both themes, and keyboard-only play.
- **Design checks:** impeccable's detector and audit, plus a pass against the web-interface-guidelines.

## 12. Out of scope (v1)

Backend, real leaderboards, Google SSO and accounts, individual leaderboards, puzzle analysis, i18n, offline/service worker. The `leaderboard.ts` and `storage.ts` interfaces are the swap points for a real backend later.

---

## v2: Wordle rework (2026-10-23, client direction)

This section supersedes §5 (points), §9 (visual design), and the leaderboard metrics in §8.

- **Tabs.** A prototype tab bar under the header switches between **Daily 5** (the 5-puzzle set) and **Solo** (one puzzle). Each mode keeps its own progress, history and stats.
- **Solo, Wordle-exact.** There is one daily puzzle (from the Tricky band, never the same puzzle as Daily 5's).
  - You get 6 tries. Each wrong move uses one try, shown in a row of 6 tiles that flip grey; solving flips the next tile green. Result is "n/6".
  - After 6 misses the solution plays out and the result is "X/6". There are no hints and no Show me.
- **Daily 5.** Rules are unchanged: mistakes are unlimited, there's a Hint (off in Hard Mode), and "Show me" is still never automatic.
  - The day counts as a **win** when all 5 are solved without Show me. Result is "n/5" solved.
- **No points.** The stats are Wordle's: Played, Win %, Current Streak, Max Streak (consecutive *wins*), plus a distribution chart.
  - Daily 5's chart buckets puzzles solved, 0–5. Solo's buckets tries for wins, 1–6.
  - Today's bar is green.
- **Post-game is Wordle's.**
  1. A toast with a win word (Solo: Genius, Magnificent, Impressive, Splendid, Great, Phew).
  2. The tiles bounce.
  3. A Statistics card opens with the countdown "Next puzzle" and a green **Share** button.
- **Share text:**
  - Daily 5 is `ChessPage 1 4/5` followed by the 🟩🟨🟥 grid.
  - Solo is `ChessPage Solo 1 3/6` followed by ⬜⬜🟩.
  - Test runs say `ChessPage test` in place of the day number.
- **Leaderboard.** It's per country and simulated, with three tabs: Win %, Average (puzzles solved, or tries; lower is better for Solo), and Streak.
- **Look.** Light mode only, white ground, Wordle palette:
  - green `#6aaa64`, yellow `#c9b458`, grey `#787c7e`, borders `#d3d6da`, key grey `#d3d6da`.
  - Bold serif title centered in a 50px header with icon buttons: leaderboard on the left; help, stats and settings on the right.
  - Board squares are white and light grey with a tile-grey border. The last move is tinted yellow and the selected piece green.
  - Buttons are styled like Wordle's keyboard keys.
  - Modals are centered white cards.
  - Toasts are black pills near the top.
  - Settings: Hard Mode, High Contrast Mode (orange/blue), Sound, Coordinates, Test mode.
- **Not copied.** The Wordle name, the NYT logo and the NYT's own fonts (system serif and sans stacks stand in for them).

## v3: single puzzle only (2026-10-23, client direction)

- **Daily 5 is removed from the UI, along with the tabs.** The app is the 6-tries puzzle only. The Daily 5 logic stays in `Game.tsx` and `lib/` so it can come back.
- **Hint works in Solo, in two steps.**
  1. The first tap outlines the piece to move.
  2. The second tap draws a green arrow and dot to its destination.
  3. Hint is then disabled until the player makes a correct move, after which it re-enables.
- Hard Mode removes the Hint button.
- A hinted solve ends on 🟨 instead of 🟩, and its toast says "Solved" instead of a Wordle win word.
- The share title is now `ChessPage <day> n/6`.
- **Look.** The board is slate blue (`#e3e9ee` / `#8ea4b4`), distinct from the green selection and the yellow last move. There's more whitespace: 20px side gutters on phones, the board capped at 520px, and more space between the tiles, board and strip. The test chip floats below the header instead of crowding it.
- **Share grid (v3.1).** Misses share as 🟨 and the solve as 🟩, e.g. `ChessPage 12 3/6` followed by 🟨🟨🟩. A hinted solve also ends 🟩, with a 💡 at the end of the first line. On-screen tiles are unchanged: misses grey, a hinted solve yellow. The stats countdown label is "Next puzzle".
- **End state explains the puzzle (v3.2).**
  - The puzzle data now carries Lichess theme tags, and the most telling one is shown under the tiles once the puzzle ends, e.g. "The idea: Fork". The order is in `lib/themes.ts`.
  - The strip shows "Out of tries" or "Solved", with the full solution in notation (`Solution: Qd5+ Kh8 Qxc6 a6 Na3`).
  - The reveal plays at reading pace, about 0.8s per arrow and 0.65s per move, with a green arrow before each of the player's moves.
  - **Replay** rewinds and plays the solution again, including from the locked state after a reload.
- **Share grid (v3.3).** Misses share as ♟️ and the solve as 👑, e.g. `ChessPage 12 3/6` followed by ♟️♟️👑. A hinted solve keeps the 👑 and adds 💡 to the first line. Try counting is unchanged: a try is used only by a wrong move. Option B (one try = one full attempt, with Wordle-style rows) is parked pending the client pitch.
