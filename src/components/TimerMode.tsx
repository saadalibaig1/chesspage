import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Stage, StatusLine } from './Parts';
import { usePuzzle } from './usePuzzle';
import { LEVELS, randomPuzzle, type Pool } from '../lib/daily';
import type { Sq } from '../lib/puzzle';
import { formatTime, rushLevel, STRIKES, TIMER_MS, timerShareText } from '../lib/results';
import { shareOrCopy } from '../lib/share';
import type { Store } from '../lib/storage';
import { PuzzleTimer } from '../lib/timer';
import { play } from '../lib/sound';

type Props = {
  pool: Pool;
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  paused: boolean;
  toast: (msg: string, ms?: number) => void;
};

type State = 'ready' | 'running' | 'over';

/** Three minutes, three strikes. Puzzles get harder every two solves. */
export function TimerMode({ pool, store, update, paused, toast }: Props) {
  const g = usePuzzle(paused);
  const clock = useRef(new PuzzleTimer());
  const [state, setState] = useState<State>('ready');
  const [left, setLeft] = useState(TIMER_MS);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [copied, setCopied] = useState(false);
  const scoreRef = useRef(0);
  const bestAtStart = useRef(0);
  const live = useRef(false);

  useEffect(() => g.show(randomPuzzle(pool, 0)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // The clock stops while a dialog is open or the tab is hidden, like the per-puzzle timer.
  useEffect(() => clock.current.pause('modal', paused), [paused]);
  useEffect(() => {
    const t = clock.current;
    const onVis = () => t.pause('hidden', document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (state !== 'running') return;
    const t = setInterval(() => {
      const ms = TIMER_MS - clock.current.elapsed();
      setLeft(Math.max(0, ms));
      if (ms <= 0) finish('time');
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const next = (solved: number) => g.start(randomPuzzle(pool, rushLevel(solved)), [], 250);

  function begin() {
    scoreRef.current = 0;
    bestAtStart.current = store.timer.best;
    live.current = true;
    setScore(0);
    setStrikes(0);
    setNewBest(false);
    setLeft(TIMER_MS);
    clock.current.reset();
    clock.current.start();
    setState('running');
    next(0);
  }

  function finish(why: 'time' | 'strikes') {
    if (!live.current) return;
    live.current = false;
    clock.current.stop();
    g.stop();
    setState('over');
    const s = scoreRef.current;
    const best = s > bestAtStart.current;
    setNewBest(best);
    if (best) update((st) => ({ ...st, timer: { best: s } }));
    toast(why === 'time' ? 'Time’s up' : 'Three strikes', 2000);
    if (s > 0) play('complete');
  }

  function onMove(from: Sq, to: Sq) {
    const res = g.move(from, to);
    if (res === 'wrong' || res === 'repeat') {
      const n = strikes + 1;
      setStrikes(n);
      if (n >= STRIKES) return finish('strikes');
      g.setPhase('failed'); // no more moves on this one
      g.setStatus({ text: 'Miss', sub: `${STRIKES - n} ${STRIKES - n === 1 ? 'strike' : 'strikes'} left`, bad: true });
      g.later(700, () => next(scoreRef.current));
    } else if (res === 'solved') {
      scoreRef.current++;
      setScore(scoreRef.current);
      g.later(300, () => next(scoreRef.current));
    }
  }

  async function share() {
    await shareOrCopy(timerShareText(scoreRef.current));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const low = state === 'running' && left < 10_000;

  return (
    <>
      <div className="topline rush">
        <span className="strikes" aria-label={`${strikes} of ${STRIKES} strikes`}>
          {Array.from({ length: STRIKES }, (_, i) => <span key={i} className={i < strikes ? 'on' : ''}>✕</span>)}
        </span>
        <span className={`clock num${low ? ' low' : ''}`} role="timer" aria-label="Time left">{formatTime(left + 999)}</span>
        <span className="score num" aria-label={`${score} solved`}>✓ {score}</span>
      </div>
      <p className="subtitle">
        {state === 'ready' ? `3 minutes · ${STRIKES} strikes` : state === 'running' ? `Level ${LEVELS[rushLevel(score)]}` : `Best ${Math.max(store.timer.best, score)}`}
      </p>

      <Stage g={g} coords={store.settings.coords} onMove={onMove} />

      <footer className="strip">
        {state === 'ready' ? (
          <>
            <p className="status">
              <span className="status-text"><b>Solve as many as you can</b><small>Puzzles get harder as you go</small></span>
            </p>
            <button type="button" className="key go wide" onClick={begin}>Start</button>
          </>
        ) : state === 'running' ? (
          <StatusLine g={g} />
        ) : (
          <>
            <p className="status" aria-live="polite">
              <span className="status-text">
                <b>{score} solved</b>
                <small>{newBest ? 'New best!' : `Best ${store.timer.best}`}</small>
              </span>
            </p>
            <div className="keys">
              <button type="button" className="key" onClick={share}>
                {copied ? 'Copied' : 'Share'} <Icon name={copied ? 'check' : 'share'} size={16} />
              </button>
              <button type="button" className="key go" onClick={begin}>Again</button>
            </div>
          </>
        )}
      </footer>
    </>
  );
}
