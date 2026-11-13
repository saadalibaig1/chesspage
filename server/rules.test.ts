import { checkUsername, dateAllowed, dayScore, rank } from './rules';

describe('dateAllowed', () => {
  const now = new Date('2026-11-10T03:00:00Z');
  it('allows the UTC date and one day either side', () => {
    expect(dateAllowed('2026-11-09', now)).toBe(true);
    expect(dateAllowed('2026-11-10', now)).toBe(true);
    expect(dateAllowed('2026-11-11', now)).toBe(true);
  });
  it('refuses older and later days and bad input', () => {
    for (const d of ['2026-11-08', '2026-11-12', '2026-02-30', '20261110', '', 'x']) expect(dateAllowed(d, now)).toBe(false);
  });
});

describe('checkUsername', () => {
  it('accepts 3 to 15 letters, numbers and _', () => {
    for (const n of ['abc', 'Magnus_C', 'a1b2c3d4e5f6g7h']) expect(checkUsername(n)).toBeNull();
  });
  it('explains what is wrong', () => {
    expect(checkUsername('ab')).toMatch(/3/);
    expect(checkUsername('a'.repeat(16))).toMatch(/15/);
    expect(checkUsername('bad name')).toMatch(/letters/);
    expect(checkUsername('xFuckx')).toMatch(/another/);
  });
});

describe('rank', () => {
  it('orders by score, then more levels solved, then less time', () => {
    const row = (username: string, score: number, solved: number, timeMs: number) => ({ username, country: 'PK', score, solved, timeMs, played: 6 });
    const rows = [row('d', 900, 3, 1), row('b', 1200, 4, 9), row('a', 1200, 5, 9), row('c', 1200, 4, 20)];
    expect(rank(rows).map((r) => r.username)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('dayScore', () => {
  it('adds up the score of every finished level', () => {
    const done = [
      { level: 0, mistakes: 0, hinted: false, failed: false },
      { level: 5, mistakes: 1, hinted: false, failed: false },
      { level: 3, mistakes: 5, hinted: false, failed: true },
    ];
    expect(dayScore(done)).toBe(100 + 480);
  });
});
