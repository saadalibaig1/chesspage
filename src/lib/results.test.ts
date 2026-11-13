import {
  emptyDay, formatTime, ladderStats, levelWord, shareText, TIMER_MS, timerShareText, TRIES, triesLeft, tryMarks, withLevel, levelScore,
  type DayResult, type LevelResult,
} from './results';

const lv = (o: Partial<LevelResult> = {}): LevelResult => ({ mistakes: 0, hinted: false, failed: false, timeMs: 1000, ...o });
/** A day with the first n levels solved and the next one failed. */
const day = (n: number): DayResult => ({
  n, levels: Array.from({ length: 6 }, (_, i) => (i < n ? lv() : i === n ? lv({ failed: true, mistakes: 5 }) : null)),
});

test('triesLeft: 5 tries on each level, each wrong move uses one', () => {
  expect(TRIES).toBe(5);
  expect(triesLeft(0)).toBe(5);
  expect(triesLeft(4)).toBe(1);
  expect(triesLeft(5)).toBe(0);
});

test('withLevel: levels can be played in any order; n counts the solved ones', () => {
  let d = emptyDay();
  expect(d).toEqual({ n: 0, levels: [null, null, null, null, null, null] });
  d = withLevel(d, 3, lv({ mistakes: 2 }));
  d = withLevel(d, 0, lv({ failed: true, mistakes: 5 }));
  d = withLevel(d, 5, lv());
  expect(d.n).toBe(2);
  expect(d.levels.map((l) => (l ? (l.failed ? 'x' : 'ok') : '-'))).toEqual(['x', '-', '-', 'ok', '-', 'ok']);
});

test('shareText: one row per played level, a pawn per wrong move and a crown for the solve', () => {
  let d = emptyDay();
  d = withLevel(d, 0, lv());
  d = withLevel(d, 1, lv({ mistakes: 1 }));
  d = withLevel(d, 2, lv({ failed: true, mistakes: 5 }));
  d = withLevel(d, 4, lv({ mistakes: 2 }));
  expect(shareText(12, d)).toBe('ChessPage 12 · 3/4\n1000 👑\n1200 ✖️👑\n1400 ✖️✖️✖️✖️✖️\n1800 ✖️✖️👑');
  expect(shareText(12, withLevel(emptyDay(), 5, lv({ hinted: true })), true)).toBe('ChessPage test · 1/1 💡\n2000 👑');
});

test('levelWord: by tries used; a hinted solve is just "Solved"', () => {
  expect([0, 1, 2, 3, 4].map((m) => levelWord(lv({ mistakes: m })))).toEqual(['Genius', 'Magnificent', 'Impressive', 'Great', 'Phew']);
  expect(levelWord(lv({ hinted: true }))).toBe('Solved');
  expect(levelWord(lv({ failed: true, mistakes: 5 }))).toBe('Out of tries');
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

test('formatTime', () => {
  expect(formatTime(167000)).toBe('2:47');
});

describe('tryMarks', () => {
  it('shows a pawn per wrong try, then a dot per try left, while playing', () => {
    expect(tryMarks(0, 'play')).toEqual(['open', 'open', 'open', 'open', 'open']);
    expect(tryMarks(2, 'play')).toEqual(['miss', 'miss', 'open', 'open', 'open']);
  });

  it('puts a crown on the solving try and keeps a dot for each try not needed', () => {
    expect(tryMarks(0, 'solved')).toEqual(['crown', 'open', 'open', 'open', 'open']);
    expect(tryMarks(1, 'solved')).toEqual(['miss', 'crown', 'open', 'open', 'open']);
    expect(tryMarks(4, 'solved')).toEqual(['miss', 'miss', 'miss', 'miss', 'crown']);
  });

  it('shows only pawns for a failed level', () => {
    expect(tryMarks(5, 'failed')).toEqual(['miss', 'miss', 'miss', 'miss', 'miss']);
  });
});

describe('levelScore', () => {
  it('is worth 100 to 600 by level, for a clean solve', () => {
    expect(levelScore(0, { mistakes: 0, hinted: false, failed: false })).toBe(100);
    expect(levelScore(5, { mistakes: 0, hinted: false, failed: false })).toBe(600);
  });

  it('takes 20% off per wrong move and 30% off for a hint', () => {
    expect(levelScore(5, { mistakes: 1, hinted: false, failed: false })).toBe(480);
    expect(levelScore(5, { mistakes: 0, hinted: true, failed: false })).toBe(420);
    expect(levelScore(5, { mistakes: 2, hinted: true, failed: false })).toBe(269);
  });

  it('gives nothing for a level out of tries', () => {
    expect(levelScore(5, { mistakes: 5, hinted: false, failed: true })).toBe(0);
  });
});
