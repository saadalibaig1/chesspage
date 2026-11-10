import { levelFromPath, levelLink, levelShareText } from './links';

describe('levelFromPath', () => {
  it('maps /1 to /6 to level indexes 0 to 5', () => {
    expect(levelFromPath('/1')).toBe(0);
    expect(levelFromPath('/6')).toBe(5);
    expect(levelFromPath('/2/')).toBe(1);
  });

  it('gives null for the home page and anything else', () => {
    for (const p of ['/', '', '/0', '/7', '/12', '/timer', '/2/x', '/a2']) expect(levelFromPath(p)).toBeNull();
  });
});

describe('level links', () => {
  it('builds the link for a level index', () => {
    expect(levelLink('https://chesspage.com', 1)).toBe('https://chesspage.com/2');
  });

  it('names the level and its rating in the share text', () => {
    expect(levelShareText('https://chesspage.com', 1)).toBe('ChessPage · Level 2 · 1200 Elo\nhttps://chesspage.com/2');
  });
});
