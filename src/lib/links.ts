import { LADDER_SIZE, LEVELS } from './daily';

/** A level link: the day it was shared from (null for the short /N form) and the level index. */
export type LevelLink = { date: string | null; level: number };

/** /YYYY/MM/DD/N (or the short /N) opens level N of today's Daily. Null for any other path. */
export function parseLink(path: string): LevelLink | null {
  const m = /^(?:\/(\d{4})\/(\d{2})\/(\d{2}))?\/(\d)\/?$/.exec(path);
  if (!m) return null;
  const n = Number(m[4]);
  if (n < 1 || n > LADDER_SIZE) return null;
  if (!m[1]) return { date: null, level: n - 1 };
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  // Rejects dates that don't exist, like 2026-02-30.
  const real = new Date(`${date}T00:00:00Z`);
  return !isNaN(+real) && real.toISOString().startsWith(date) ? { date, level: n - 1 } : null;
}

export const levelPath = (date: string, i: number) => `/${date.replaceAll('-', '/')}/${i + 1}`;

export const levelLink = (origin: string, date: string, i: number) => origin + levelPath(date, i);

export const levelShareText = (origin: string, date: string, i: number) =>
  `ChessPage · Level ${i + 1} · ${LEVELS[i]} Elo\n${levelLink(origin, date, i)}`;
