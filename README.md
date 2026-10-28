# ChessPage

A daily chess puzzle game in the style of Wordle. Three modes:

- **Daily (default):** 6 levels, 1000 → 2000 rating, the same for everyone. Tap any level to play it, in any order; do one, a few or all six. You get 5 tries on each level. A wrong move uses a try; the same wrong move again is free. Out of tries ends that level only and plays its solution (the idea, the full solution, Replay). Share: one row per played level, e.g. `ChessPage 12 · 3/4` then `1200 ♟️👑` (a pawn per wrong move, a crown for the solve).
- **Practice:** pick a level (1000–2200). Unlimited, not counted. A clean solve under 15s moves you up a level.
- **Timer:** one 1600 puzzle a day, the same for everyone, against a 1-minute clock. The board stays blurred under a Start key until the clock starts; a reload resumes the clock. Share: `ChessPage Timer 12` / `⏱️ 0:38` (or `⏱️ X`).
- **Hint:** tap once to see which piece moves. Tap again to see where it goes. Hard Mode turns hints off.
- Stats count the Daily levels: days played, average solved, streak of days with at least one level played. Country leaderboards are simulated.

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
