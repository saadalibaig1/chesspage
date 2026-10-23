import type { DayResult, Mode } from './results';

// Prototype only: synthetic country stats, stable for a given day.
export const COUNTRIES = [
  'IN', 'US', 'RU', 'DE', 'GB', 'FR', 'ES', 'BR', 'PK', 'PL', 'UA', 'IT', 'NL', 'TR', 'AR',
  'CA', 'AU', 'MX', 'PH', 'ID', 'NG', 'EG', 'IR', 'NO', 'SE', 'JP', 'KR', 'CN', 'BD', 'ZA',
];
const WEIGHT = [1, 0.95, 0.8, 0.6, 0.55, 0.5, 0.45, 0.45, 0.4, 0.4, 0.38, 0.35, 0.3, 0.3, 0.28,
  0.27, 0.25, 0.24, 0.22, 0.22, 0.2, 0.18, 0.18, 0.15, 0.15, 0.14, 0.13, 0.12, 0.12, 0.1];

export type Row = { iso: string; players: number; winPct: number; avg: number; longestStreak: number; you?: boolean };
export type Metric = 'win' | 'avg' | 'streak';

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

export function simulatedRows(date: string, mode: Mode): Row[] {
  return COUNTRIES.map((iso, i) => {
    const r = seeded(date + mode + iso);
    const w = WEIGHT[i];
    const skill = 0.5 * w + 0.5 * r();
    return {
      iso,
      players: Math.round(50 + 4950 * w * (0.7 + 0.3 * r())),
      winPct: Math.round(45 + 50 * skill),
      avg: round2(mode === 'five' ? 2.6 + 2.2 * skill : 4.4 - 2.0 * skill),
      longestStreak: Math.round(20 + 380 * (0.5 * w + 0.5 * r())),
    };
  });
}

export function withPlayer(rows: Row[], iso: string, r: DayResult | null, streak: number): Row[] {
  const list = rows.some((x) => x.iso === iso) ? rows : [...rows, { iso, players: 0, winPct: 0, avg: 0, longestStreak: 0 }];
  return list.map((x) => {
    if (x.iso !== iso) return x;
    if (!r) return { ...x, you: true };
    const p = x.players + 1;
    return {
      ...x,
      you: true,
      players: p,
      winPct: Math.round((x.winPct * x.players + (r.won ? 100 : 0)) / p),
      avg: round2((x.avg * x.players + r.n) / p),
      longestStreak: Math.max(x.longestStreak, streak),
    };
  });
}

export function ranked(rows: Row[], m: Metric, mode: Mode): Row[] {
  const by = {
    win: (a: Row, b: Row) => b.winPct - a.winPct,
    avg: mode === 'five' ? (a: Row, b: Row) => b.avg - a.avg : (a: Row, b: Row) => (a.avg || 99) - (b.avg || 99),
    streak: (a: Row, b: Row) => b.longestStreak - a.longestStreak,
  }[m];
  return [...rows].sort(by);
}
