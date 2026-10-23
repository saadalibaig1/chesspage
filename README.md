# ChessPage

A daily chess puzzle in the style of Wordle: one puzzle a day, six tries, and the same puzzle for everyone.

- Every wrong move uses a try.
- **Hint:** tap once to see which piece moves. Tap again to see where it goes. Hard Mode turns hints off.
- After the puzzle: the idea (e.g. "Fork"), the full solution, and Replay.
- Stats, streaks and the share text follow Wordle, e.g. `ChessPage 12 3/6` followed by ♟️♟️👑.
- Country leaderboards are simulated in this prototype.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + data integrity tests
npm run build      # static site in dist/ (host anywhere)
npm run puzzles    # regenerate src/data/puzzles.json from the Lichess puzzle DB
```

- **Testing:** open Settings (⚙) and turn on **Test Mode**. You get unlimited random puzzles that never count toward stats. The "Test · New puzzle" pill deals a fresh one.
- **Reset your day:** in devtools, run `localStorage.removeItem('chesspage:v2')`.
- **Saved data:** progress and stats are stored in the browser (localStorage). There is no backend.
- **Hosting:** a plain static site. Import the repo into Vercel, which detects Vite automatically, then add your domain in Project → Settings → Domains.
- **Daily 5 mode:** a five-puzzle mode is parked in the code (`Game.tsx`, `lib/`). It isn't shown in the app.
- **Docs:** see `docs/superpowers/specs/` for the spec and `DESIGN.md` for the design system.
- **Credits:** puzzles from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0). Pieces are cburnett (CC BY-SA 3.0).
