import { levelLink, levelPath, levelShareText, parseLink } from './links';

describe('parseLink', () => {
  it('reads the date and level index from /YYYY/MM/DD/N', () => {
    expect(parseLink('/2026/11/10/2')).toEqual({ date: '2026-11-10', level: 1 });
    expect(parseLink('/2026/11/10/6/')).toEqual({ date: '2026-11-10', level: 5 });
  });

  it('still reads the short form /N, with no date', () => {
    expect(parseLink('/1')).toEqual({ date: null, level: 0 });
    expect(parseLink('/6')).toEqual({ date: null, level: 5 });
  });

  it('gives null for the home page and anything else', () => {
    for (const p of ['/', '', '/0', '/7', '/12', '/timer', '/2/x', '/2026/11/10', '/2026/11/10/7', '/2026/13/10/2', '/2026/02/30/2', '/26/11/10/2'])
      expect(parseLink(p)).toBeNull();
  });
});

describe('level links', () => {
  it('builds the path and link for a date and level index', () => {
    expect(levelPath('2026-11-10', 1)).toBe('/2026/11/10/2');
    expect(levelLink('https://chesspage.com', '2026-11-10', 1)).toBe('https://chesspage.com/2026/11/10/2');
  });

  it('names the level and its rating in the share text', () => {
    expect(levelShareText('https://chesspage.com', '2026-11-10', 1)).toBe(
      'ChessPage · Level 2 · 1200 Elo\nhttps://chesspage.com/2026/11/10/2',
    );
  });
});
