import { IDEAS, themeExplain, themeLabel } from './themes';

test('themeLabel picks the most telling idea', () => {
  expect(themeLabel('advantage defensiveMove fork')).toBe('Fork');
  expect(themeLabel('mate mateIn2 backRankMate')).toBe('Mate in 2');
  expect(themeLabel('crushing hangingPiece')).toBe('Hanging piece');
  expect(themeLabel('advantage')).toBe('Win material');
  expect(themeLabel('')).toBe('Find the best move');
  expect(themeLabel('somethingNew')).toBe('Find the best move');
});

test('themeExplain says in plain words what the idea means', () => {
  expect(themeExplain('advantage defensiveMove fork')).toBe('Attack two pieces with one piece at the same time. They can save only one.');
  expect(themeExplain('somethingNew')).toBe('Look for the strongest move. Try checks, captures and threats first.');
});

test('every idea has a short explanation', () => {
  for (const { label, explain } of IDEAS) {
    expect(explain, label).toMatch(/\.$/);
    expect(explain.length, label).toBeLessThan(120);
  }
});
