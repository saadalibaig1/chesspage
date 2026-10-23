import { dailySet, dailySolo, dayNumber, localDateKey, msUntilMidnight, randomSet, type Pool } from './daily';

const band = (b: number): Pool[number] =>
  Array.from({ length: 365 }, (_, i) => [`b${b}-${i}`, '8/8/8/8/8/8/8/8 w - - 0 1', 'a1a2 a2a3', 800 + b * 300] as [string, string, string, number]);
const pool: Pool = [0, 1, 2, 3, 4].map(band);

test('localDateKey uses the local calendar date', () => {
  expect(localDateKey(new Date(2026, 9, 23, 23, 59))).toBe('2026-10-23');
  expect(localDateKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
});

test('dayNumber counts from launch day 1', () => {
  expect(dayNumber('2026-10-23')).toBe(1);
  expect(dayNumber('2026-10-24')).toBe(2);
  expect(dayNumber('2027-03-30')).toBe(159); // across DST change
});

test('dailySet is deterministic and ordered by band', () => {
  const a = dailySet('2026-11-02', pool);
  expect(a).toEqual(dailySet('2026-11-02', pool));
  expect(a.map((p) => p.band)).toEqual([0, 1, 2, 3, 4]);
  expect(a[0].moves).toEqual(['a1a2', 'a2a3']);
});

test('dailySet never repeats a puzzle within 365 days', () => {
  for (let b = 0; b < 5; b++) {
    const ids = new Set<string>();
    for (let d = 0; d < 365; d++) {
      const key = localDateKey(new Date(2026, 9, 23 + d));
      ids.add(dailySet(key, pool)[b].id);
    }
    expect(ids.size).toBe(365);
  }
});

test('randomSet picks one puzzle per band', () => {
  const s = randomSet(pool, () => 0.5);
  expect(s.map((p) => p.id)).toEqual(['b0-182', 'b1-182', 'b2-182', 'b3-182', 'b4-182']);
});

test('msUntilMidnight', () => {
  expect(msUntilMidnight(new Date(2026, 9, 23, 23, 0))).toBe(3_600_000);
});

test('dailySolo is a Tricky puzzle that never equals the Daily 5 one', () => {
  for (let d = 0; d < 365; d++) {
    const key = localDateKey(new Date(2026, 9, 23 + d));
    const solo = dailySolo(key, pool);
    expect(solo.band).toBe(3);
    expect(solo.id).not.toBe(dailySet(key, pool)[3].id);
  }
});

test('puzzles carry their Lichess themes', () => {
  const withThemes: Pool = [[['t1', '8/8/8/8/8/8/8/8 w - - 0 1', 'a1a2 a2a3', 900, 'fork advantage']]];
  expect(dailySet('2026-10-23', withThemes)[0].themes).toBe('fork advantage');
  expect(dailySet('2026-10-23', pool)[0].themes).toBe('');
});
