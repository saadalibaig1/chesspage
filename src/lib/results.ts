export type Mode = 'five' | 'solo';
export type Outcome = 'clean' | 'messy' | 'revealed' | 'miss';
export type PuzzleResult = { band: number; timeMs: number; mistakes: number; hinted: boolean; revealed: boolean };
/** n = puzzles solved (Daily 5) or tries used (Solo). */
export type DayResult = { won: boolean; n: number; grid: Outcome[]; timeMs: number };

export const MAX_TRIES = 6;

export function outcomeOf(r: PuzzleResult): Outcome {
  if (r.revealed) return 'revealed';
  return r.mistakes || r.hinted ? 'messy' : 'clean';
}

export function fiveResult(results: PuzzleResult[]): DayResult {
  const n = results.filter((r) => !r.revealed).length;
  return { won: n === results.length, n, grid: results.map(outcomeOf), timeMs: results.reduce((t, r) => t + r.timeMs, 0) };
}

export function soloResult(misses: number, solved: boolean, timeMs: number, hinted = false): DayResult {
  const last: Outcome = hinted ? 'messy' : 'clean';
  const grid: Outcome[] = [...Array(Math.min(misses, MAX_TRIES)).fill('miss'), ...(solved ? [last] : [])];
  return { won: solved, n: solved ? misses + 1 : MAX_TRIES, grid, timeMs };
}

const EMOJI: Record<Mode, Record<Outcome, string>> = {
  five: { clean: '🟩', messy: '🟨', revealed: '🟥', miss: '⬜' },
  // Solo: a pawn per miss, a crown for the solve (hinted or not; a hint shows as 💡).
  // The pawn carries U+FE0F so it renders as an emoji, not a text glyph.
  solo: { clean: '👑', messy: '👑', revealed: '🟥', miss: '♟️' },
};

export function shareText(mode: Mode, day: number, r: DayResult, test = false): string {
  const label = test ? 'test' : String(day);
  const hinted = mode === 'solo' && r.grid.at(-1) === 'messy' ? ' 💡' : '';
  const head = mode === 'five' ? `ChessPage ${label} ${r.n}/5` : `ChessPage ${label} ${r.won ? r.n : 'X'}/${MAX_TRIES}${hinted}`;
  return `${head}\n${r.grid.map((o) => EMOJI[mode][o]).join('')}`;
}

const SOLO_WORDS = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'];
const FIVE_WORDS = ['Better luck tomorrow', 'Better luck tomorrow', 'Not bad', 'Nice', 'Great', 'Magnificent'];

export function winWord(mode: Mode, r: DayResult): string {
  if (mode === 'solo') {
    if (!r.won) return 'Better luck tomorrow';
    return r.grid.at(-1) === 'messy' ? 'Solved' : SOLO_WORDS[r.n - 1]; // no "Genius" for a hinted solve
  }
  return FIVE_WORDS[r.n];
}

function prevDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export type Stats = { played: number; winPct: number; current: number; max: number; dist: number[]; labels: string[]; today: number | null };

export function stats(mode: Mode, history: Record<string, DayResult>, today: string): Stats {
  const days = Object.keys(history).sort();
  const wins = days.filter((d) => history[d].won).length;

  let current = 0;
  for (let d = history[today] ? today : prevDay(today); history[d]?.won; d = prevDay(d)) current++;

  let max = 0;
  let run = 0;
  let prev = '';
  for (const d of days) {
    run = history[d].won ? (prev && prevDay(d) === prev && run ? run + 1 : 1) : 0;
    max = Math.max(max, run);
    prev = d;
  }

  const labels = mode === 'five' ? ['0', '1', '2', '3', '4', '5'] : ['1', '2', '3', '4', '5', '6'];
  const dist = labels.map(() => 0);
  const bucket = (r: DayResult) => (mode === 'five' ? r.n : r.won ? r.n - 1 : -1);
  for (const d of days) {
    const b = bucket(history[d]);
    if (b >= 0) dist[b]++;
  }
  const t = history[today];
  return {
    played: days.length,
    winPct: days.length ? Math.round((wins / days.length) * 100) : 0,
    current,
    max,
    dist,
    labels,
    today: t && bucket(t) >= 0 ? Number(labels[bucket(t)]) : null,
  };
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
