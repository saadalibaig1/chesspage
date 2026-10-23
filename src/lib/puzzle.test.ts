import { PuzzleRun } from './puzzle';
import type { Puzzle } from './daily';

const p = (fen: string, moves: string, band = 0): Puzzle => ({ id: 'x', fen, moves: moves.split(' '), rating: 1000, band, themes: '' });
const P8 = p('r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24', 'f2g3 e6e7 b2b1 b3c1 b1c1 h6c1', 3);
const BACK_RANK = p('7k/5ppp/8/8/8/8/8/RR4K1 b - - 0 1', 'h8g8 a1a8');
const PROMO = p('k7/4P3/1K6/8/8/8/8/8 b - - 0 1', 'a8b8 e7e8q');

test('constructor plays the opponent first move', () => {
  const r = new PuzzleRun(P8);
  expect(r.player).toBe('w');
  expect(r.lastMove).toMatchObject({ from: 'f2', to: 'g3', by: 'b' });
  expect(r.totalSteps).toBe(3);
  expect(r.step).toBe(0);
  expect(r.status).toBe('playing');
});

test('wrong move leaves the position unchanged', () => {
  const r = new PuzzleRun(P8);
  const before = r.fen();
  expect(r.tryMove('e6', 'e5')).toBe('wrong');
  expect(r.fen()).toBe(before);
  expect(r.tryMove('e6', 'a1')).toBe('illegal');
});

test('correct moves advance and the reply is played on request', () => {
  const r = new PuzzleRun(P8);
  expect(r.hint()).toBe('e6');
  expect(r.hintTo()).toBe('e7');
  expect(r.tryMove('e6', 'e7')).toBe('correct');
  expect(r.step).toBe(1);
  expect(r.reply()).toMatchObject({ from: 'b2', to: 'b1', by: 'b' });
  expect(r.inCheck()).toBe(true);
  expect(r.tryMove('b3', 'c1')).toBe('correct');
  r.reply();
  expect(r.tryMove('h6', 'c1')).toBe('solved');
  expect(r.status).toBe('solved');
  expect(r.reply()).toBeNull();
});

test('reveal plays the rest of the solution', () => {
  const r = new PuzzleRun(P8);
  expect(r.reveal()).toHaveLength(5);
  expect(r.status).toBe('revealed');
});

test('an alternative mate on the last move is accepted', () => {
  const r = new PuzzleRun(BACK_RANK);
  expect(r.tryMove('b1', 'b8')).toBe('solved');
});

test('promotion uses the solution piece', () => {
  const r = new PuzzleRun(PROMO);
  expect(r.needsPromotion('e7', 'e8')).toBe(true);
  expect(r.targets('e7')).toContain('e8');
  expect(r.tryMove('e7', 'e8')).toBe('solved');
  expect(r.lastMove?.san).toBe('e8=Q#');
});

test('opening can be deferred so the UI can animate it', () => {
  const r = new PuzzleRun(P8, false);
  expect(r.player).toBe('w');
  expect(r.lastMove).toBeNull();
  expect(r.turn()).toBe('b');
  expect(r.open()).toMatchObject({ from: 'f2', to: 'g3' });
  expect(r.turn()).toBe('w');
  expect(r.open()).toBeNull();
});

test('revealNext plays one solution move at a time', () => {
  const r = new PuzzleRun(P8);
  expect(r.revealNext()).toMatchObject({ from: 'e6', to: 'e7' });
  expect(r.status).toBe('revealed');
  let n = 1;
  while (r.revealNext()) n++;
  expect(n).toBe(5);
  expect(r.step).toBe(3);
});

test('castling reports the rook move so the UI can slide it', () => {
  const r = new PuzzleRun(p('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1', 'e8g8 e1c1'));
  expect(r.lastMove).toMatchObject({ from: 'e8', to: 'g8', rook: { from: 'h8', to: 'f8' } });
  expect(r.tryMove('e1', 'c1')).toBe('solved');
  expect(r.lastMove?.rook).toEqual({ from: 'a1', to: 'd1' });
});

test('solution lists the moves after the setup in notation', () => {
  const r = new PuzzleRun(P8);
  expect(r.solution()).toEqual(['Rxe7', 'Qb1+', 'Nc1', 'Qxc1+', 'Qxc1']);
  r.tryMove('e6', 'e7');
  expect(r.solution()).toHaveLength(5); // independent of progress
});

test('restart rewinds to the setup position for a replay', () => {
  const r = new PuzzleRun(P8);
  r.reveal();
  r.restart();
  expect(r.status).toBe('revealed');
  expect(r.step).toBe(0);
  expect(r.lastMove).toMatchObject({ from: 'f2', to: 'g3' });
  expect(r.revealNext()).toMatchObject({ from: 'e6', to: 'e7' });
});
