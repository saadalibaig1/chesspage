import { LADDER_SIZE } from './daily';
import type { DayResult } from './results';

// Prototype only: synthetic country stats, stable for a given day.
export const COUNTRIES = [
  'IN', 'US', 'RU', 'DE', 'GB', 'FR', 'ES', 'BR', 'PK', 'PL', 'UA', 'IT', 'NL', 'TR', 'AR',
  'CA', 'AU', 'MX', 'PH', 'ID', 'NG', 'EG', 'IR', 'NO', 'SE', 'JP', 'KR', 'CN', 'BD', 'ZA',
];
const WEIGHT = [1, 0.95, 0.8, 0.6, 0.55, 0.5, 0.45, 0.45, 0.4, 0.4, 0.38, 0.35, 0.3, 0.3, 0.28,
  0.27, 0.25, 0.24, 0.22, 0.22, 0.2, 0.18, 0.18, 0.15, 0.15, 0.14, 0.13, 0.12, 0.12, 0.1];

/** avg = puzzles solved on the ladder; fullPct = share of players who climbed all six. */
export type Row = { iso: string; players: number; avg: number; fullPct: number; longestStreak: number; you?: boolean };
export type Metric = 'avg' | 'full' | 'streak';

function seeded(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function simulatedRows(date: string): Row[] {
  return COUNTRIES.map((iso, i) => {
    const r = seeded(date + iso);
    const w = WEIGHT[i];
    const skill = 0.5 * w + 0.5 * r();
    return {
      iso,
      players: Math.round(50 + 4950 * w * (0.7 + 0.3 * r())),
      avg: round2(1.8 + 2.2 * skill),
      fullPct: Math.round(2 + 14 * skill),
      longestStreak: Math.round(20 + 380 * (0.5 * w + 0.5 * r())),
    };
  });
}

export function withPlayer(rows: Row[], iso: string, r: DayResult | null, streak: number): Row[] {
  const list = rows.some((x) => x.iso === iso) ? rows : [...rows, { iso, players: 0, avg: 0, fullPct: 0, longestStreak: 0 }];
  return list.map((x) => {
    if (x.iso !== iso) return x;
    if (!r) return { ...x, you: true };
    const p = x.players + 1;
    return {
      ...x,
      you: true,
      players: p,
      avg: round2((x.avg * x.players + r.n) / p),
      fullPct: Math.round((x.fullPct * x.players + (r.n === LADDER_SIZE ? 100 : 0)) / p),
      longestStreak: Math.max(x.longestStreak, streak),
    };
  });
}

export function ranked(rows: Row[], m: Metric): Row[] {
  const key = ({ avg: 'avg', full: 'fullPct', streak: 'longestStreak' } as const)[m];
  return [...rows].sort((a, b) => b[key] - a[key]);
}
