import { checkUsername, dateAllowed, rank } from './rules';

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
  it('orders by solved, then fewer hinted, then fewer mistakes, then less time', () => {
    const row = (username: string, solved: number, hinted: number, mistakes: number, timeMs: number) =>
      ({ username, country: 'PK', solved, hinted, mistakes, timeMs, played: 6 });
    const rows = [row('e', 3, 0, 0, 1), row('a', 5, 0, 2, 9), row('c', 5, 1, 0, 1), row('b', 5, 0, 2, 5), row('d', 5, 0, 3, 1)];
    expect(rank(rows).map((r) => r.username)).toEqual(['b', 'a', 'd', 'c', 'e']);
  });
});
