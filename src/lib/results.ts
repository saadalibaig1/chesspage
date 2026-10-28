import { LADDER_SIZE, LEVELS } from './daily';

export type Mode = 'ladder' | 'practice' | 'timer';
/** One level of the day. failed = used all its tries. */
export type LevelResult = { mistakes: number; hinted: boolean; failed: boolean; timeMs: number };
/** The day so far: one entry per ladder level (null = not played yet). n = levels solved. */
export type DayResult = { n: number; levels: (LevelResult | null)[] };
/** Timer mode's day: solved within the minute, and how long it took. */
export type TimerResult = { solved: boolean; ms: number };

/** Tries per ladder level. Each wrong move uses one; the same wrong move again is free. */
export const TRIES = 5;
export const TIMER_MS = 60_000;
const QUICK_MS = 15_000;

export const emptyDay = (): DayResult => ({ n: 0, levels: Array(LADDER_SIZE).fill(null) });

export function withLevel(day: DayResult, i: number, r: LevelResult): DayResult {
  const levels = day.levels.map((l, j) => (j === i ? r : l));
  return { n: levels.filter((l) => l && !l.failed).length, levels };
}

export const triesLeft = (mistakes: number) => Math.max(0, TRIES - mistakes);

// The pawn carries U+FE0F so it renders as an emoji, not a text glyph.
const PAWN = '\u265F\uFE0F';

/** One row per played level: a pawn per wrong move, then a crown if solved. */
export function shareText(day: number, r: DayResult, test = false): string {
  const played = r.levels.flatMap((l, i) => (l ? [{ l, i }] : []));
  const hinted = played.some(({ l }) => l.hinted) ? ' 💡' : '';
  const rows = played.map(({ l, i }) => `${LEVELS[i]} ${PAWN.repeat(l.mistakes)}${l.failed ? '' : '👑'}`);
  return [`ChessPage ${test ? 'test' : day} · ${r.n}/${played.length}${hinted}`, ...rows].join('\n');
}

const WORDS = ['Genius', 'Magnificent', 'Impressive', 'Great', 'Phew'];

export function levelWord(r: LevelResult): string {
  if (r.failed) return 'Out of tries';
  return r.hinted ? 'Solved' : WORDS[Math.min(r.mistakes, WORDS.length - 1)];
}

function prevDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export type Stats = { played: number; avg: number; current: number; max: number; dist: number[]; today: number | null };

/** The streak counts consecutive days played, whatever the score. */
export function ladderStats(history: Record<string, DayResult>, today: string): Stats {
  const days = Object.keys(history).sort();

  let current = 0;
  for (let d = history[today] ? today : prevDay(today); history[d]; d = prevDay(d)) current++;

  let max = 0;
  let run = 0;
  let prev = '';
  for (const d of days) {
    run = prev && prevDay(d) === prev ? run + 1 : 1;
    max = Math.max(max, run);
    prev = d;
  }

  const dist = Array(LADDER_SIZE + 1).fill(0);
  for (const d of days) dist[history[d].n]++;
  const total = days.reduce((t, d) => t + history[d].n, 0);
  return {
    played: days.length,
    avg: days.length ? Math.round((total / days.length) * 10) / 10 : 0,
    current,
    max,
    dist,
    today: history[today]?.n ?? null,
  };
}

export const timerShareText = (day: number, r: TimerResult, test = false) =>
  `ChessPage Timer ${test ? 'test' : day}\n⏱️ ${r.solved ? formatTime(r.ms) : 'X'}`;

/** Practice moves up a level after a quick solve with no miss or hint. */
export function practiceNext(level: number, timeMs: number, clean: boolean): number {
  return clean && timeMs < QUICK_MS ? Math.min(LEVELS.length - 1, level + 1) : level;
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
