export type Puzzle = { id: string; fen: string; moves: string[]; rating: number; band: number; themes: string };
/** [id, fen, uci moves, rating, Lichess themes] */
export type Pool = [string, string, string, number, string?][][];

export const LAUNCH = '2026-10-23';
export const BAND_NAMES = ['Warm-up', 'Easy', 'Medium', 'Tricky', 'Hard'];
const STRIDE = [7, 11, 13, 17, 19]; // coprime with 365 → a full cycle without repeats
const OFFSET = [0, 50, 100, 150, 200];
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const utc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function dayNumber(key: string): number {
  return Math.round((utc(key) - utc(LAUNCH)) / DAY_MS) + 1;
}

const toPuzzle = ([id, fen, moves, rating, themes = '']: Pool[number][number], band: number): Puzzle => ({
  id, fen, moves: moves.split(' '), rating, band, themes,
});

export function dailySet(key: string, pool: Pool): Puzzle[] {
  const day = dayNumber(key) - 1;
  return pool.map((list, b) => {
    const n = list.length;
    const i = (((day * STRIDE[b] + OFFSET[b]) % n) + n) % n;
    return toPuzzle(list[i], b);
  });
}

/** Solo mode: one Tricky puzzle a day, offset half a cycle from Daily 5's Tricky puzzle so they never match. */
export function dailySolo(key: string, pool: Pool): Puzzle {
  const list = pool[3];
  const n = list.length;
  const day = dayNumber(key) - 1;
  const i = (((day * STRIDE[3] + OFFSET[3] + Math.floor(n / 2)) % n) + n) % n;
  return toPuzzle(list[i], 3);
}

export function randomSet(pool: Pool, rand = Math.random): Puzzle[] {
  return pool.map((list, b) => toPuzzle(list[Math.floor(rand() * list.length)], b));
}

export function msUntilMidnight(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
