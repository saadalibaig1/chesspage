import { LADDER_SIZE, LEVELS } from './daily';

export type Mode = 'ladder' | 'practice' | 'timer';
export type Outcome = 'solved' | 'failed';
/** One ladder step. failed = ran out of lives on it. */
export type PuzzleResult = { level: number; timeMs: number; mistakes: number; hinted: boolean; failed: boolean };
/** A finished day: n = puzzles solved (how high you climbed). */
export type DayResult = { n: number; grid: Outcome[]; hinted: boolean; timeMs: number };

export const LIVES = 3;
export const TIMER_MS = 180_000;
export const STRIKES = 3;
const QUICK_MS = 15_000;

export function ladderResult(results: PuzzleResult[]): DayResult {
  return {
    n: results.filter((r) => !r.failed).length,
    grid: results.map((r) => (r.failed ? 'failed' : 'solved')),
    hinted: results.some((r) => r.hinted),
    timeMs: results.reduce((t, r) => t + r.timeMs, 0),
  };
}

export function livesLeft(results: PuzzleResult[], currentMistakes: number): number {
  return Math.max(0, LIVES - results.reduce((t, r) => t + r.mistakes, 0) - currentMistakes);
}

const EMOJI: Record<Outcome, string> = { solved: '🟩', failed: '🟥' };

export function shareText(day: number, r: DayResult, test = false): string {
  const head = `ChessPage ${test ? 'test' : day} ${r.n}/${LADDER_SIZE}${r.hinted ? ' 💡' : ''}`;
  const squares = Array.from({ length: LADDER_SIZE }, (_, i) => (r.grid[i] ? EMOJI[r.grid[i]] : '⬜'));
  return `${head}\n${squares.join('')}`;
}

const WORDS = ['Better luck tomorrow', 'Good start', 'Nice', 'Great', 'Impressive', 'Magnificent', 'Genius'];
export const winWord = (r: DayResult) => WORDS[r.n];

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

/** Timer mode starts at the first level and climbs one level every two solves. */
export const rushLevel = (solved: number) => Math.min(LEVELS.length - 1, Math.floor(solved / 2));

export const timerShareText = (score: number) => `ChessPage Timer\n⏱️ ${score} solved in ${formatTime(TIMER_MS)}`;

/** Practice moves up a level after a quick solve with no miss or hint. */
export function practiceNext(level: number, timeMs: number, clean: boolean): number {
  return clean && timeMs < QUICK_MS ? Math.min(LEVELS.length - 1, level + 1) : level;
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
