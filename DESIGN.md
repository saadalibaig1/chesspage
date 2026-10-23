# ChessPage design system (v2: Wordle-inspired)

The look is light mode only, simple, and modelled on Wordle's layout, palette and post-game flow. It uses no Wordle or NYT branding or fonts.

## Layout (top to bottom, one centred column)

| Region | Size | Content |
|---|---|---|
| Header | 56px, 1px bottom rule | Leaderboard icon on the left; bold serif **ChessPage** centred; help, stats and settings icons on the right |
| Tile row | 34px | Six tries tiles. The single puzzle is the only mode for now; Daily 5 is parked in code |
| Subtitle | 16px | Uppercase grey: "One puzzle · six tries" |
| Board | `min(100vw − 40px, 100dvh − 256px, 520px)` | Slate-blue squares, 4px radius, 2px tile-grey ring |

Test mode shows a black "Test · New puzzle" pill floating under the header, on the left (on the right in landscape).
| Strip | 52px | Side disc and status text, plus buttons styled as keyboard keys |

- The tiles, board and strip are centred vertically as one group, so the page never scrolls.
- On phones in landscape, the board sits on the left and the controls stack on the right.

## Tokens (`src/styles.css :root`)

| Token | Value |
|---|---|
| `--bg` / `--text` | `#ffffff` / `#121213` |
| `--muted` / `--grey` | `#787c7e` |
| `--line` / `--key` | `#d3d6da` |
| `--line-strong` (active tile) | `#878a8c` |
| `--green` / `--yellow` | `#6aaa64` / `#c9b458`; high-contrast mode swaps in `#f5793a` / `#85c0f9` |
| `--red` (revealed) | `#d0574b` |
| Board | squares `#e3e9ee` / `#8ea4b4`. The last move is a 55–70% yellow mix and the selected piece a 65% green mix. The first hint tap puts a green inset ring on the piece; the second adds a green arrow and a dot on its square. Legal targets use 20% ink dots and rings |

## Type

The title uses a serif stack (Georgia) at 700, 30px. The UI uses a sans stack (Helvetica Neue / Arial). Section titles are uppercase, 700, with +0.04em tracking. Numbers use tabular numerals.

## Components

- **Tiles:** 2px `--line` border. The active tile gets a `--line-strong` border and a 100ms pop. A filled tile flips over 500ms and turns green, yellow, red or grey. On a win the whole row bounces with a 100ms stagger.
- **Keys:** `#d3d6da` fill with a 4px radius, bold uppercase 13px, 44px tall. A primary "Next" key is green.
- **Modals:** a centred white card (max 500px wide, 8px radius, `0 4px 23px rgb(0 0 0 / .2)` shadow) over a 50% white scrim, with a close × at the top right.
- **Statistics card:** four big numbers (Played, Win %, Current Streak, Max Streak), then the distribution bars (grey, with today's bar green), then "Next puzzle" with a countdown beside a green SHARE button.
- **Toasts:** black pills with white bold 14px text near the top, shown for 1s (2s for win words).
- **Settings:** rows with an 18px title and 12px grey description, plus a small green toggle.

## Motion

Piece slides take 120ms (220ms for the opponent). The wrong-move shake takes 200ms. Tiles pop, flip and bounce, and modal cards slide in over 200ms. Everything is removed under `prefers-reduced-motion`.

## Sound

Sounds are synthesized with Web Audio (`lib/sound.ts`): move and capture knocks, check, wrong, solved and a completion arpeggio. Haptics use `navigator.vibrate`.
