import { dailyLadder, dayNumber, LADDER_SIZE, LEVELS, localDateKey, msUntilMidnight, randomLadder, randomPuzzle, type Pool } from './daily';

const level = (l: number): Pool[number] =>
  Array.from({ length: 365 }, (_, i) => [`l${l}-${i}`, '8/8/8/8/8/8/8/8 w - - 0 1', 'a1a2 a2a3', LEVELS[l]] as [string, string, string, number]);
const pool: Pool = LEVELS.map((_, l) => level(l));

test('levels run 1000 to 2200; the ladder climbs the first six', () => {
  expect(LEVELS).toEqual([1000, 1200, 1400, 1600, 1800, 2000, 2200]);
  expect(LADDER_SIZE).toBe(6);
});

test('localDateKey uses the local calendar date', () => {
  expect(localDateKey(new Date(2026, 9, 23, 23, 59))).toBe('2026-10-23');
  expect(localDateKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
});

test('dayNumber counts from launch day 1', () => {
  expect(dayNumber('2026-10-23')).toBe(1);
  expect(dayNumber('2026-10-24')).toBe(2);
  expect(dayNumber('2027-03-30')).toBe(159); // across DST change
});

test('dailyLadder is deterministic and climbs one level per step', () => {
  const a = dailyLadder('2026-11-02', pool);
  expect(a).toEqual(dailyLadder('2026-11-02', pool));
  expect(a.map((p) => p.level)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(a[0].moves).toEqual(['a1a2', 'a2a3']);
});

test('dailyLadder never repeats a puzzle within 365 days', () => {
  for (let l = 0; l < LADDER_SIZE; l++) {
    const ids = new Set<string>();
    for (let d = 0; d < 365; d++) ids.add(dailyLadder(localDateKey(new Date(2026, 9, 23 + d)), pool)[l].id);
    expect(ids.size).toBe(365);
  }
});

test('randomPuzzle picks from one level; randomLadder from each ladder level', () => {
  expect(randomPuzzle(pool, 6, () => 0.5)).toMatchObject({ id: 'l6-182', level: 6, rating: 2200 });
  expect(randomLadder(pool, () => 0.5).map((p) => p.id)).toEqual(['l0-182', 'l1-182', 'l2-182', 'l3-182', 'l4-182', 'l5-182']);
});

test('msUntilMidnight', () => {
  expect(msUntilMidnight(new Date(2026, 9, 23, 23, 0))).toBe(3_600_000);
});

test('puzzles carry their Lichess themes', () => {
  const withThemes: Pool = [[['t1', '8/8/8/8/8/8/8/8 w - - 0 1', 'a1a2 a2a3', 900, 'fork advantage']]];
  expect(randomPuzzle(withThemes, 0).themes).toBe('fork advantage');
  expect(dailyLadder('2026-10-23', pool)[0].themes).toBe('');
});
