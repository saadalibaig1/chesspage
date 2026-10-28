export type Puzzle = { id: string; fen: string; moves: string[]; rating: number; level: number; themes: string };
/** One list per level: [id, fen, uci moves, rating, Lichess themes] */
export type Pool = [string, string, string, number, string?][][];

export const LAUNCH = '2026-10-23';
/** Puzzle levels (Lichess rating, ±100). The daily ladder climbs the first LADDER_SIZE. */
export const LEVELS = [1000, 1200, 1400, 1600, 1800, 2000, 2200];
export const LADDER_SIZE = 6;
const STRIDE = [7, 11, 13, 17, 19, 23, 29]; // coprime with 365 → a full cycle without repeats
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

const toPuzzle = ([id, fen, moves, rating, themes = '']: Pool[number][number], level: number): Puzzle => ({
  id, fen, moves: moves.split(' '), rating, level, themes,
});

/** Today's ladder: one puzzle per level, the same for everyone. */
export function dailyLadder(key: string, pool: Pool): Puzzle[] {
  const day = dayNumber(key) - 1;
  return pool.slice(0, LADDER_SIZE).map((list, l) => {
    const n = list.length;
    const i = (((day * STRIDE[l] + l * 50) % n) + n) % n;
    return toPuzzle(list[i], l);
  });
}

export function randomPuzzle(pool: Pool, level: number, rand = Math.random): Puzzle {
  const list = pool[level];
  return toPuzzle(list[Math.floor(rand() * list.length)], level);
}

export function randomLadder(pool: Pool, rand = Math.random): Puzzle[] {
  return Array.from({ length: LADDER_SIZE }, (_, l) => randomPuzzle(pool, l, rand));
}

export function msUntilMidnight(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
