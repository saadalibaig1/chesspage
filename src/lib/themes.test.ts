import { themeLabel } from './themes';

test('themeLabel picks the most telling idea', () => {
  expect(themeLabel('advantage defensiveMove fork')).toBe('Fork');
  expect(themeLabel('mate mateIn2 backRankMate')).toBe('Mate in 2');
  expect(themeLabel('crushing hangingPiece')).toBe('Hanging piece');
  expect(themeLabel('advantage')).toBe('Win material');
  expect(themeLabel('')).toBe('Find the best move');
  expect(themeLabel('somethingNew')).toBe('Find the best move');
});
