import { LADDER_SIZE, LEVELS } from './daily';

/** /1 to /6 open that level of today's Daily. Returns the level index, or null for any other path. */
export function levelFromPath(path: string): number | null {
  const m = /^\/(\d)\/?$/.exec(path);
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= LADDER_SIZE ? n - 1 : null;
}

export const levelLink = (origin: string, i: number) => `${origin}/${i + 1}`;

export const levelShareText = (origin: string, i: number) =>
  `ChessPage · Level ${i + 1} · ${LEVELS[i]} Elo\n${levelLink(origin, i)}`;
