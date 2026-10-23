import pool from '../data/puzzles.json';
import { dailySet, type Pool } from './daily';
import { PuzzleRun } from './puzzle';

test('pool has 5 bands of 365 puzzles with rising ratings', () => {
  const p = pool as unknown as Pool;
  expect(p.map((b) => b.length)).toEqual([365, 365, 365, 365, 365]);
  const avg = p.map((b) => b.reduce((s, x) => s + x[3], 0) / b.length);
  for (let i = 1; i < 5; i++) expect(avg[i]).toBeGreaterThan(avg[i - 1]);
});

test('every solution replays legally to the end', () => {
  for (const band of pool as unknown as Pool) {
    for (const [id, fen, moves, rating] of band) {
      const run = new PuzzleRun({ id, fen, moves: moves.split(' '), rating, band: 0, themes: '' });
      expect(run.totalSteps).toBeLessThanOrEqual(3);
      expect(() => run.reveal()).not.toThrow();
    }
  }
});

test('the full solution, played move by move, is accepted as solved', () => {
  const set = dailySet('2026-10-23', pool as unknown as Pool);
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
