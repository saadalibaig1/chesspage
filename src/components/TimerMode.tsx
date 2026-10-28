import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { SolutionLine, Stage, StatusLine } from './Parts';
import { usePuzzle } from './usePuzzle';
import { LEVELS, type Puzzle } from '../lib/daily';
import type { Sq } from '../lib/puzzle';
import { formatTime, TIMER_MS, timerShareText, type TimerResult } from '../lib/results';
import { shareOrCopy } from '../lib/share';
import type { Store } from '../lib/storage';
import { themeLabel } from '../lib/themes';
import { PuzzleTimer } from '../lib/timer';
import { play } from '../lib/sound';

type Props = {
  puzzle: Puzzle;
  today: string;
  day: number;
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  test: boolean;
  paused: boolean;
  toast: (msg: string, ms?: number) => void;
};

type State = 'ready' | 'running' | 'over';

/** One puzzle a day, the same for everyone, against a one-minute clock. The board stays hidden until Start. */
export function TimerMode({ puzzle, today, day, store, update, test, paused, toast }: Props) {
  const g = usePuzzle(paused);
  const done = test ? undefined : store.timer.history[today];
  const saved = !test && store.timer.progress?.date === today ? store.timer.progress : undefined;
  const [state, setState] = useState<State>(done ? 'over' : 'ready');
  const [result, setResult] = useState<TimerResult | null>(done ?? null);
  const [left, setLeft] = useState(TIMER_MS - (saved?.elapsed ?? 0));
  const [copied, setCopied] = useState(false);
  const clock = useRef(new PuzzleTimer());
  const offset = useRef(saved?.elapsed ?? 0); // time used before a reload
  const live = useRef(false);

  const used = () => offset.current + clock.current.elapsed();

  useEffect(() => g.show(puzzle, !!done), []); // eslint-disable-line react-hooks/exhaustive-deps

  // The clock stops while a dialog is open or the tab is hidden, like the per-puzzle timer.
  useEffect(() => clock.current.pause('modal', paused), [paused]);
  useEffect(() => {
    const t = clock.current;
    const onVis = () => t.pause('hidden', document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const saveProgress = () => {
    if (!test) update((s) => ({ ...s, timer: { ...s.timer, progress: { date: today, elapsed: used(), tried: g.run?.tried() ?? [] } } }));
  };

  useEffect(() => {
    if (state !== 'running') return;
    let ticks = 0;
    const t = setInterval(() => {
      const ms = TIMER_MS - used();
      setLeft(Math.max(0, ms));
      if (ms <= 0) return timeUp();
      if (++ticks % 5 === 0) saveProgress(); // about once a second, so a reload resumes the clock
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function begin() {
    live.current = true;
    clock.current.reset();
    clock.current.start();
    setState('running');
    g.start(puzzle, saved?.tried ?? []);
    // Mark the run as started now, so a reload can't buy a fresh clock.
    if (!test) update((s) => ({ ...s, timer: { ...s.timer, progress: { date: today, elapsed: offset.current, tried: saved?.tried ?? [] } } }));
  }

  function finish(r: TimerResult) {
    live.current = false;
    clock.current.stop();
    setResult(r);
    setState('over');
    if (!test) update((s) => ({ ...s, timer: { history: { ...s.timer.history, [today]: r } } }));
    toast(r.solved ? `Solved in ${formatTime(r.ms)}` : 'Out of time', 2000);
    if (r.solved) play('complete');
  }

  function timeUp() {
    if (!live.current) return;
    g.stop();
    finish({ solved: false, ms: TIMER_MS });
    g.playSolution(() => g.setPhase('failed'));
  }

  function onMove(from: Sq, to: Sq) {
    const res = g.move(from, to);
    if (res === 'repeat') {
      toast('Already tried that', 2500);
      g.setStatus({ text: 'Already tried that', sub: 'Try another move', bad: true });
    } else if (res === 'wrong') {
      saveProgress();
      toast('Not quite', 2500);
      g.setStatus({ text: 'Not quite', sub: 'Keep going', bad: true });
    } else if (res === 'solved') {
      finish({ solved: true, ms: Math.min(used(), TIMER_MS) });
    }
  }

  async function share() {
    await shareOrCopy(timerShareText(day, result!, test));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const low = state === 'running' && left < 10_000;
  const shown = state === 'over' && result ? (result.solved ? result.ms : TIMER_MS - result.ms) : left;

  return (
    <>
      <div className="topline">
        <span className={`clock num${low ? ' low' : ''}`} role="timer" aria-label="Time left">
          {formatTime(state === 'over' && result?.solved ? shown : shown + 999)}
        </span>
      </div>
      <p className="subtitle">
        {state === 'over' ? `The idea: ${themeLabel(puzzle.themes)}` : `One puzzle · one minute · ${LEVELS[puzzle.level]}`}
      </p>

      <Stage g={g} coords={store.settings.coords} onMove={onMove} veiled={state === 'ready'} />

      <footer className="strip">
        {state === 'ready' ? (
          <>
            <p className="status">
              <span className="status-text">
                <b>{saved ? `${formatTime(left + 999)} left` : 'Beat the clock'}</b>
                <small>{saved ? 'Your clock is paused' : 'The board shows when you start'}</small>
              </span>
            </p>
            <button type="button" className="key go wide" onClick={begin}>{saved ? 'Resume' : 'Start'}</button>
          </>
        ) : state === 'running' ? (
          <StatusLine g={g} />
        ) : (
          <>
            <SolutionLine g={g} title={result?.solved ? `Solved in ${formatTime(result.ms)}` : 'Out of time'} />
            <div className="keys">
              <button type="button" className="key" onClick={g.replay} disabled={g.phase === 'revealing'}>Replay</button>
              <button type="button" className="key" onClick={share}>
                {copied ? 'Copied' : 'Share'} <Icon name={copied ? 'check' : 'share'} size={16} />
              </button>
            </div>
          </>
        )}
      </footer>
    </>
  );
}
