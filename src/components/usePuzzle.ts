import { useEffect, useRef, useState } from 'react';
import type { Puzzle } from '../lib/daily';
import { PuzzleRun, type LastMove, type Sq, type TryResult } from '../lib/puzzle';
import { PuzzleTimer } from '../lib/timer';
import { buzz, play } from '../lib/sound';

export type Phase = 'idle' | 'opening' | 'play' | 'reply' | 'revealing' | 'solved' | 'failed' | 'done';
/** bad = a wrong move: shown in red and kept until the next move. */
export type Status = { text: string; sub?: string; bad?: boolean };

const REPLY_MS = 280;
const OPEN_MS = 450;

export const side = (c: 'w' | 'b') => (c === 'w' ? 'White' : 'Black');

function sfx(m: LastMove, run: PuzzleRun) {
  play(run.inCheck() ? 'check' : m.captured ? 'capture' : 'move');
}

/** Drives one puzzle on the board: setup move, the player's moves and replies, hints, and the solution playback. */
export function usePuzzle(paused: boolean) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState<Status>({ text: '' });
  const [version, setVersion] = useState(0);
  const [hintSq, setHintSq] = useState<Sq | null>(null);
  const [hintTo, setHintTo] = useState<Sq | null>(null); // second hint tap: show the path
  const [shake, setShake] = useState<{ sq: Sq; n: number } | null>(null);
  const [replaying, setReplaying] = useState(false);

  const run = useRef<PuzzleRun | null>(null);
  const timer = useRef(new PuzzleTimer());
  const epoch = useRef(0);
  const bump = () => setVersion((v) => v + 1);

  /** setTimeout that is dropped once a new puzzle starts. */
  const later = (ms: number, fn: () => void) => {
    const e = epoch.current;
    setTimeout(() => e === epoch.current && fn(), ms);
  };

  useEffect(() => timer.current.pause('modal', paused), [paused]);
  useEffect(() => {
    const t = timer.current;
    const onVis = () => t.pause('hidden', document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const clearHint = () => {
    setHintSq(null);
    setHintTo(null);
  };

  function reset(r: PuzzleRun) {
    epoch.current++;
    run.current = r;
    clearHint();
    setShake(null);
    setReplaying(false);
    timer.current.reset();
  }

  /** Shows a puzzle without play: its start position, or fully solved for a finished day. */
  function show(p: Puzzle, solved = false) {
    const r = new PuzzleRun(p);
    if (solved) r.reveal();
    reset(r);
    setPhase(solved ? 'done' : 'idle');
    bump();
  }

  /** Plays the opponent's setup move, then hands the board to the player. */
  function start(p: Puzzle, tried: string[] = [], openMs = OPEN_MS) {
    const r = new PuzzleRun(p, false);
    r.restoreTried(tried);
    reset(r);
    setPhase('opening');
    setStatus({ text: 'Get ready…', sub: `${side(r.turn())} is moving` });
    bump();
    later(openMs, () => {
      const m = r.open()!;
      sfx(m, r);
      bump();
      setPhase('play');
      setStatus({ text: `${side(r.player)} to move`, sub: `${side(m.by)} played ${m.san}` });
      timer.current.start();
    });
  }

  /** Stops play (Timer mode ran out). */
  function stop() {
    epoch.current++;
    clearHint();
    timer.current.stop();
    setPhase('done');
  }

  /** Solve time so far, with pauses taken out. */
  const elapsed = () => timer.current.stop();

  /** The player's move. Feedback for wrong and repeated moves is left to the caller. */
  function move(from: Sq, to: Sq): TryResult {
    const r = run.current!;
    if (phase !== 'play') return 'illegal';
    const res = r.tryMove(from, to);
    if (res === 'illegal') return res;
    if (res === 'wrong' || res === 'repeat') {
      setShake((s) => ({ sq: from, n: (s?.n ?? 0) + 1 }));
      if (res === 'wrong') {
        play('wrong');
        buzz([30, 0, 30]);
      }
      bump();
      return res;
    }
    sfx(r.lastMove!, r);
    buzz(10);
    clearHint();
    setShake(null);
    bump();
    if (res === 'solved') {
      later(120, () => play('solved'));
      setPhase('solved');
      setStatus({ text: 'Solved' });
      return res;
    }
    setPhase('reply');
    setStatus({ text: 'Good move', sub: 'Wait for the reply' });
    later(REPLY_MS, () => {
      const m = r.reply();
      if (m) sfx(m, r);
      bump();
      setPhase('play');
      setStatus({ text: `${side(r.player)} to move`, sub: m ? `${side(m.by)} played ${m.san}` : undefined });
    });
    return res;
  }

  /** First tap outlines the piece to move (returns true); second tap draws its path. */
  function hint(): boolean {
    const r = run.current!;
    if (!hintSq) {
      setHintSq(r.hint());
      return true;
    }
    setHintTo(r.hintTo());
    return false;
  }

  /** Plays the rest of the solution at reading pace, drawing an arrow before each of the player's moves. */
  function playSolution(onEnd: () => void) {
    const r = run.current!;
    setPhase('revealing');
    clearHint();
    const stepOnce = () => {
      const from = r.hint();
      if (!from) return onEnd();
      const playIt = () => {
        clearHint();
        const m = r.revealNext()!;
        sfx(m, r);
        bump();
        later(650, stepOnce);
      };
      if (r.turn() !== r.player) return playIt();
      setHintSq(from);
      setHintTo(r.hintTo());
      later(800, playIt);
    };
    stepOnce();
  }

  function replay() {
    const r = run.current!;
    const back = phase;
    setReplaying(true);
    r.restart();
    bump();
    later(500, () =>
      playSolution(() => {
        setPhase(back);
        setReplaying(false);
      }),
    );
  }

  return {
    run: run.current, phase, setPhase, status, setStatus, version, hintSq, hintTo, shake, replaying,
    later, show, start, stop, elapsed, move, hint, playSolution, replay,
  };
}
