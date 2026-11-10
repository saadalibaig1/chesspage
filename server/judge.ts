import type { Puzzle } from '../src/lib/daily.js';
import { PuzzleRun, type TryResult } from '../src/lib/puzzle.js';
import { TRIES } from '../src/lib/results.js';

/** What the server keeps for one level: ply = player moves accepted so far, tried = wrong moves ("fen|uci"). */
export type LevelState = { ply: number; tried: string[]; mistakes: number; hinted: boolean; done: boolean; failed: boolean };
export type Judged = {
  result: TryResult | 'failed';
  state: LevelState;
  /** The opponent's answer (uci) after a correct move. */
  reply?: string;
  /** Tries left after a wrong move. */
  left?: number;
  /** The whole line (uci) once the level is failed. */
  solution?: string[];
};

export const fresh = (): LevelState => ({ ply: 0, tried: [], mistakes: 0, hinted: false, done: false, failed: false });

/** Rebuilds the position the player is at. */
function replay(p: Puzzle, s: LevelState): PuzzleRun {
  const run = new PuzzleRun(p);
  for (let k = 0; k < s.ply; k++) {
    const m = p.moves[1 + 2 * k];
    run.tryMove(m.slice(0, 2), m.slice(2, 4));
    run.reply();
  }
  run.restoreTried(s.tried);
  return run;
}

/** Checks one player move with the same rules as the browser game (PuzzleRun). */
export function judge(p: Puzzle, s: LevelState, from: string, to: string, tries = TRIES): Judged {
  if (s.done) return { result: 'illegal', state: s };
  const run = replay(p, s);
  const res = run.tryMove(from, to);
  if (res === 'illegal' || res === 'repeat') return { result: res, state: s };
  if (res === 'wrong') {
    const mistakes = s.mistakes + 1;
    const state = { ...s, mistakes, tried: run.tried() };
    if (mistakes >= tries) return { result: 'failed', state: { ...state, done: true, failed: true }, solution: p.moves };
    return { result: 'wrong', state, left: tries - mistakes };
  }
  const state = { ...s, ply: s.ply + 1, tried: [] };
  if (res === 'solved') return { result: 'solved', state: { ...state, done: true } };
  return { result: 'correct', state, reply: p.moves[2 + 2 * s.ply] };
}

/** The moves (uci) on the board so far: the setup move, then each accepted move and its reply. */
export const played = (p: Puzzle, s: LevelState) => p.moves.slice(0, Math.min(p.moves.length, 1 + 2 * s.ply));

/** The square to move from and to, for a hint. */
export function hintFor(p: Puzzle, s: LevelState) {
  const m = p.moves[1 + 2 * s.ply] ?? '';
  return { from: m.slice(0, 2), to: m.slice(2, 4) };
}
