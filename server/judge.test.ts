import pool from '../src/data/puzzles.json';
import { dailyLadder, type Pool } from '../src/lib/daily';
import { fresh, judge, played } from './judge';

const p = dailyLadder('2026-11-10', pool as unknown as Pool)[0];
const at = (i: number) => [p.moves[i].slice(0, 2), p.moves[i].slice(2, 4)] as const;

/** A legal move that isn't the solution move at index i. */
function wrongMove(i: number): [string, string] {
  const s = fresh();
  for (const from of 'abcdefgh'.split('').flatMap((f) => '12345678'.split('').map((r) => f + r)))
    for (const to of 'abcdefgh'.split('').flatMap((f) => '12345678'.split('').map((r) => f + r))) {
      if (from + to === p.moves[i].slice(0, 4)) continue;
      if (i === 1 && judge(p, s, from, to).result === 'wrong') return [from, to];
    }
  throw new Error('no wrong move');
}

describe('judge', () => {
  it('walks the solution: correct moves get the reply, the last one solves', () => {
    let s = fresh();
    for (let i = 1; i < p.moves.length; i += 2) {
      const r = judge(p, s, ...at(i));
      s = r.state;
      if (i + 1 < p.moves.length) {
        expect(r.result).toBe('correct');
        expect(r.reply).toBe(p.moves[i + 1]);
      } else expect(r.result).toBe('solved');
    }
    expect(s.done).toBe(true);
    expect(s.failed).toBe(false);
    expect(s.mistakes).toBe(0);
  });

  it('counts a wrong move once; the same wrong move again is free', () => {
    const [from, to] = wrongMove(1);
    const a = judge(p, fresh(), from, to);
    expect(a.result).toBe('wrong');
    expect(a.state.mistakes).toBe(1);
    expect(a.left).toBe(4);
    const b = judge(p, a.state, from, to);
    expect(b.result).toBe('repeat');
    expect(b.state.mistakes).toBe(1);
  });

  it('fails the level after the last try and gives the solution', () => {
    const s = { ...fresh(), mistakes: 4 };
    const r = judge(p, s, ...wrongMove(1));
    expect(r.result).toBe('failed');
    expect(r.state).toMatchObject({ done: true, failed: true, mistakes: 5 });
    expect(r.solution).toEqual(p.moves);
  });

  it('never fails when tries are unlimited (Timer)', () => {
    const r = judge(p, { ...fresh(), mistakes: 40 }, ...wrongMove(1), Infinity);
    expect(r.result).toBe('wrong');
    expect(r.state.done).toBe(false);
  });

  it('refuses moves on a finished level, and illegal moves cost nothing', () => {
    expect(judge(p, { ...fresh(), done: true }, ...at(1)).result).toBe('illegal');
    const r = judge(p, fresh(), 'a1', 'a1');
    expect(r.result).toBe('illegal');
    expect(r.state.mistakes).toBe(0);
  });

  it('lists the moves on the board so far, to restore a level', () => {
    expect(played(p, fresh())).toEqual([p.moves[0]]);
    expect(played(p, { ...fresh(), ply: 1 })).toEqual(p.moves.slice(0, 3));
  });
});
