const DAY_MS = 86_400_000;

/** The server serves and scores only the current day: the UTC date ±1, which covers every time zone. */
export function dateAllowed(date: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return false;
  const today = Date.parse(now.toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.abs(t - today) <= DAY_MS;
}

const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'whore', 'slut', 'dick', 'pussy', 'bitch', 'admin', 'chesspage'];

/** Null when the username is fine, otherwise the reason. */
export function checkUsername(name: string): string | null {
  if (name.length < 3) return 'Use at least 3 characters.';
  if (name.length > 15) return 'Use 15 characters or fewer.';
  if (!/^[A-Za-z0-9_]+$/.test(name)) return 'Use only letters, numbers and _.';
  const low = name.toLowerCase();
  if (BLOCKED.some((w) => low.includes(w))) return 'Choose another name.';
  return null;
}

/** One player's day on a board. hinted = solved levels that used a hint. */
export type BoardRow = { username: string; country: string; played: number; solved: number; hinted: number; mistakes: number; timeMs: number };

/** More solved first; then fewer hinted solves, fewer wrong moves, less time. */
export const rank = (rows: BoardRow[]) =>
  [...rows].sort((a, b) => b.solved - a.solved || a.hinted - b.hinted || a.mistakes - b.mistakes || a.timeMs - b.timeMs);
