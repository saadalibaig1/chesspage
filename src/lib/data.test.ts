import pool from '../data/puzzles.json';
import { dailyLadder, LEVELS, type Pool } from './daily';
import { PuzzleRun } from './puzzle';

test('pool has 7 levels of 365 puzzles, each within 100 of its level', () => {
  const p = pool as unknown as Pool;
  expect(p.map((b) => b.length)).toEqual(LEVELS.map(() => 365));
  p.forEach((list, l) => list.forEach((x) => expect(Math.abs(x[3] - LEVELS[l])).toBeLessThanOrEqual(100)));
});

test('every solution replays legally to the end', () => {
  for (const band of pool as unknown as Pool) {
    for (const [id, fen, moves, rating] of band) {
      const run = new PuzzleRun({ id, fen, moves: moves.split(' '), rating, level: 0, themes: '' });
      expect(run.totalSteps).toBeLessThanOrEqual(3);
      expect(() => run.reveal()).not.toThrow();
    }
  }
});

test('the full solution, played move by move, is accepted as solved', () => {
  const set = dailyLadder('2026-10-23', pool as unknown as Pool);
  for (const pz of set) {
    const run = new PuzzleRun(pz);
    let last = '';
    for (let i = 1; i < pz.moves.length; i += 2) {
      last = run.tryMove(pz.moves[i].slice(0, 2), pz.moves[i].slice(2, 4));
      run.reply();
    }
    expect(last).toBe('solved');
  }
});
