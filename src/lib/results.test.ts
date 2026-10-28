import {
  formatTime, ladderResult, ladderStats, practiceNext, shareText, TIMER_MS, timerShareText, TRIES, triesLeft, winWord,
  type DayResult, type PuzzleResult,
} from './results';

const r = (o: Partial<PuzzleResult> = {}): PuzzleResult => ({ level: 0, timeMs: 10000, mistakes: 0, hinted: false, failed: false, ...o });
const day = (n: number): DayResult => ({ n, grid: [...Array(n).fill('solved'), ...(n < 6 ? ['failed'] : [])], hinted: false, timeMs: 1 });

test('ladderResult: solved count, a failed step, hint flag', () => {
  expect(ladderResult([r(), r({ mistakes: 2 }), r({ hinted: true }), r({ failed: true, mistakes: 1 })])).toEqual({
    n: 3, grid: ['solved', 'solved', 'solved', 'failed'], hinted: true, timeMs: 40000,
  });
  expect(ladderResult(Array.from({ length: 6 }, () => r()))).toMatchObject({ n: 6, hinted: false });
});

test('triesLeft: 6 tries on every puzzle, each wrong move uses one', () => {
  expect(TRIES).toBe(6);
  expect(triesLeft(0)).toBe(6);
  expect(triesLeft(5)).toBe(1);
  expect(triesLeft(6)).toBe(0);
});

test('shareText: one square per step, unreached steps white', () => {
  expect(shareText(12, day(4))).toBe('ChessPage 12 4/6\n🟩🟩🟩🟩🟥⬜');
  expect(shareText(12, day(6))).toBe('ChessPage 12 6/6\n🟩🟩🟩🟩🟩🟩');
  expect(shareText(12, day(0))).toBe('ChessPage 12 0/6\n🟥⬜⬜⬜⬜⬜');
  expect(shareText(12, { ...day(2), hinted: true }, true)).toBe('ChessPage test 2/6 💡\n🟩🟩🟥⬜⬜⬜');
});

test('winWord by how high you climbed', () => {
  expect([0, 1, 2, 3, 4, 5, 6].map((n) => winWord(day(n)))).toEqual([
    'Better luck tomorrow', 'Good start', 'Nice', 'Great', 'Impressive', 'Magnificent', 'Genius',
  ]);
});

test('ladderStats: played, average, streak of days played, distribution 0–6', () => {
  const h = { '2026-10-19': day(2), '2026-10-20': day(4), '2026-10-22': day(0), '2026-10-23': day(6) };
  expect(ladderStats(h, '2026-10-23')).toEqual({ played: 4, avg: 3, current: 2, max: 2, dist: [1, 0, 1, 0, 1, 0, 1], today: 6 });
  // today not played yet: the streak still counts through yesterday; a missed day breaks it
  expect(ladderStats(h, '2026-10-24').current).toBe(2);
  expect(ladderStats(h, '2026-10-25').current).toBe(0);
  expect(ladderStats({}, '2026-10-23')).toEqual({ played: 0, avg: 0, current: 0, max: 0, dist: [0, 0, 0, 0, 0, 0, 0], today: null });
  expect(ladderStats({ '2026-10-21': day(1), '2026-10-22': day(2), '2026-10-23': day(2) }, '2026-10-23').avg).toBe(1.7);
});

test('Timer: one minute, share shows the solve time or X', () => {
  expect(TIMER_MS).toBe(60_000);
  expect(timerShareText(12, { solved: true, ms: 38_400 })).toBe('ChessPage Timer 12\n⏱️ 0:38');
  expect(timerShareText(12, { solved: false, ms: 60_000 })).toBe('ChessPage Timer 12\n⏱️ X');
  expect(timerShareText(12, { solved: true, ms: 9_000 }, true)).toBe('ChessPage Timer test\n⏱️ 0:09');
});

test('Practice levels up after a quick, clean solve', () => {
  expect(practiceNext(2, 9000, true)).toBe(3);
  expect(practiceNext(2, 9000, false)).toBe(2); // a miss or hint
  expect(practiceNext(2, 30000, true)).toBe(2); // too slow
  expect(practiceNext(6, 5000, true)).toBe(6); // top level
});

test('formatTime', () => {
  expect(formatTime(167000)).toBe('2:47');
});
