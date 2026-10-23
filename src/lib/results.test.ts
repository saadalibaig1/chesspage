import { fiveResult, formatTime, shareText, soloResult, stats, winWord, type DayResult, type PuzzleResult } from './results';

const r = (o: Partial<PuzzleResult>): PuzzleResult => ({ band: 0, timeMs: 10000, mistakes: 0, hinted: false, revealed: false, ...o });
const W5: DayResult = { won: true, n: 5, grid: ['clean', 'clean', 'clean', 'clean', 'clean'], timeMs: 1 };
const L5: DayResult = { won: false, n: 4, grid: ['clean', 'clean', 'revealed', 'clean', 'clean'], timeMs: 1 };

test('fiveResult: solved count, win only without Show me', () => {
  expect(fiveResult([r({}), r({ mistakes: 1 }), r({ hinted: true }), r({}), r({})])).toEqual({
    won: true, n: 5, grid: ['clean', 'messy', 'messy', 'clean', 'clean'], timeMs: 50000,
  });
  const lost = fiveResult([r({}), r({ revealed: true }), r({}), r({}), r({})]);
  expect(lost).toMatchObject({ won: false, n: 4 });
  expect(lost.grid[1]).toBe('revealed');
});

test('soloResult: tries like Wordle', () => {
  expect(soloResult(2, true, 9000)).toEqual({ won: true, n: 3, grid: ['miss', 'miss', 'clean'], timeMs: 9000 });
  expect(soloResult(0, true, 9000, true)).toEqual({ won: true, n: 1, grid: ['messy'], timeMs: 9000 });
  expect(soloResult(6, false, 9000)).toEqual({ won: false, n: 6, grid: ['miss', 'miss', 'miss', 'miss', 'miss', 'miss'], timeMs: 9000 });
});

test('shareText per mode', () => {
  expect(shareText('five', 1, L5)).toBe('ChessPage 1 4/5\n🟩🟩🟥🟩🟩');
  // misses are pawns, the solve is a crown (pawn uses U+FE0F so it renders as an emoji everywhere)
  expect(shareText('solo', 12, soloResult(2, true, 1))).toBe('ChessPage 12 3/6\n♟️♟️👑');
  expect(shareText('solo', 12, soloResult(6, false, 1))).toBe('ChessPage 12 X/6\n♟️♟️♟️♟️♟️♟️');
  // a hinted solve still ends with the crown; the hint shows as 💡 on the first line
  expect(shareText('solo', 12, soloResult(1, true, 1, true), true)).toBe('ChessPage test 2/6 💡\n♟️👑');
  expect(shareText('five', 1, L5, true)).toBe('ChessPage test 4/5\n🟩🟩🟥🟩🟩');
});

test('stats: played, win %, streaks of consecutive wins, distribution', () => {
  const h = { '2026-10-19': W5, '2026-10-20': W5, '2026-10-21': L5, '2026-10-22': W5, '2026-10-23': W5 };
  expect(stats('five', h, '2026-10-23')).toEqual({ played: 5, winPct: 80, current: 2, max: 2, dist: [0, 0, 0, 0, 1, 4], labels: ['0', '1', '2', '3', '4', '5'], today: 5 });
  // today not played yet: streak still counts through yesterday
  expect(stats('five', h, '2026-10-24').current).toBe(2);
  // a missed day breaks it
  expect(stats('five', h, '2026-10-25').current).toBe(0);
  expect(stats('five', {}, '2026-10-23')).toMatchObject({ played: 0, winPct: 0, current: 0, max: 0, today: null });
});

test('stats: solo distribution counts wins by tries', () => {
  const h = { '2026-10-22': soloResult(0, true, 1), '2026-10-23': soloResult(6, false, 1) };
  const s = stats('solo', h, '2026-10-23');
  expect(s.labels).toEqual(['1', '2', '3', '4', '5', '6']);
  expect(s.dist).toEqual([1, 0, 0, 0, 0, 0]);
  expect(s.today).toBeNull();
  expect(s.current).toBe(0);
});

test('winWord', () => {
  expect(winWord('solo', soloResult(0, true, 1))).toBe('Genius');
  expect(winWord('solo', soloResult(5, true, 1))).toBe('Phew');
  expect(winWord('solo', soloResult(0, true, 1, true))).toBe('Solved');
  expect(winWord('five', W5)).toBe('Magnificent');
  expect(winWord('five', L5)).toBe('Great');
});

test('formatTime', () => {
  expect(formatTime(167000)).toBe('2:47');
});
