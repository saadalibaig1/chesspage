# ChessPage

A daily chess puzzle page in the style of Wordle, with two modes on tabs:

- **Daily 5:** five Lichess puzzles a day, easy to hard. Wrong moves are fine; "Show me" gives up a puzzle.
- **Solo:** one harder puzzle with six tries, played exactly like Wordle.

Stats, streaks and the share text follow Wordle. The country leaderboards are simulated in this prototype.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + data integrity tests
npm run build      # static site in dist/ (host anywhere)
npm run puzzles    # regenerate src/data/puzzles.json from the Lichess puzzle DB
```

- **Testing:** open Settings (⚙) and turn on **Test Mode**. You get unlimited random puzzles that never count toward stats. The "Test · New" chip in the tab bar deals fresh ones.
- **Reset your day:** in devtools, run `localStorage.removeItem('chesspage:v2')`.
- **Hosting:** `npm run build` produces a plain static site. It runs on Vercel, Netlify, S3/CloudFront or any web server.
- **Docs:** see `docs/superpowers/specs/` for the spec and `DESIGN.md` for the design system.
- **Credits:** puzzles from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0). Pieces are cburnett (CC BY-SA 3.0).
