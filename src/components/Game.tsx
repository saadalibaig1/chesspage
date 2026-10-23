import { useCallback, useEffect, useRef, useState } from 'react';
import { Board } from './Board';
import { Countdown } from './Modals';
import { BAND_NAMES, type Puzzle } from '../lib/daily';
import { PuzzleRun, type LastMove, type Sq } from '../lib/puzzle';
import { fiveResult, MAX_TRIES, outcomeOf, soloResult, winWord, type DayResult, type Mode, type Outcome, type PuzzleResult } from '../lib/results';
import { loadProgress, recordDay, type Store } from '../lib/storage';
import { themeLabel } from '../lib/themes';
import { PuzzleTimer } from '../lib/timer';
import { buzz, play } from '../lib/sound';

type Phase = 'opening' | 'play' | 'reply' | 'revealing' | 'solved' | 'revealed' | 'done';
type Status = { text: string; sub?: string };

type Props = {
  mode: Mode;
  set: Puzzle[];
  today: string;
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  test: boolean;
  paused: boolean;
  toast: (msg: string, ms?: number) => void;
  onComplete: (r: DayResult) => void;
  onShowStats: () => void;
};

const side = (c: 'w' | 'b') => (c === 'w' ? 'White' : 'Black');
const REPLY_MS = 280;
const OPEN_MS = 450;

function sfx(m: LastMove, run: PuzzleRun) {
  play(run.inCheck() ? 'check' : m.captured ? 'capture' : 'move');
}

export function Game({ mode, set, today, store, update, test, paused, toast, onComplete, onShowStats }: Props) {
  const solo = mode === 'solo';
  const doneToday = !test && !!store[mode].history[today];
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<PuzzleResult[]>([]);
  const [phase, setPhase] = useState<Phase>('opening');
  const [status, setStatus] = useState<Status>({ text: 'Get ready…' });
  const [version, setVersion] = useState(0);
  const [hintSq, setHintSq] = useState<Sq | null>(null);
  const [hintTo, setHintTo] = useState<Sq | null>(null); // second hint tap: show the path
  const [shake, setShake] = useState<{ sq: Sq; n: number } | null>(null);
  const [misses, setMisses] = useState(0);
  const [bounce, setBounce] = useState(false);
  const [replaying, setReplaying] = useState(false);

  const run = useRef<PuzzleRun | null>(null);
  const stats = useRef({ mistakes: 0, hinted: false });
  const timer = useRef(new PuzzleTimer());
  const epoch = useRef(0);
  const bump = () => setVersion((v) => v + 1);

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

  const startPuzzle = useCallback((i: number) => {
    epoch.current++;
    const r = new PuzzleRun(set[i], false);
    run.current = r;
    stats.current = { mistakes: 0, hinted: false };
    timer.current.reset();
    setIndex(i);
    setHintSq(null);
    setHintTo(null);
    setShake(null);
    setPhase('opening');
    setStatus({ text: 'Get ready…', sub: `${side(r.turn())} is moving` });
    bump();
    later(OPEN_MS, () => {
      const m = r.open()!;
      sfx(m, r);
      bump();
      setPhase('play');
      setStatus({ text: `${side(r.player)} to move`, sub: `${side(m.by)} played ${m.san}` });
      timer.current.start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  const record = (r: DayResult) => {
    if (!test) update((s) => recordDay(s, mode, today, r));
  };

  // Enter the right state for this mode/day (resume, settle interrupted reveals, or show the finished day).
  useEffect(() => {
    if (doneToday) {
      epoch.current++;
      const r = new PuzzleRun(set[set.length - 1]);
      r.reveal();
      run.current = r;
      setIndex(set.length - 1);
      setPhase('done');
      setHintSq(null);
      setHintTo(null);
      bump();
      return;
    }
    if (test) {
      setResults([]);
      setMisses(0);
      startPuzzle(0);
      return;
    }
    const p = loadProgress(store, mode, today);
    if (solo) {
      const m = p.current?.mistakes ?? 0;
      if (p.current?.revealed || m >= MAX_TRIES) return record(soloResult(MAX_TRIES, false, 0));
      setMisses(m);
      startPuzzle(0);
      stats.current.mistakes = m;
      return;
    }
    if (p.results.length >= 5) return record(fiveResult(p.results.slice(0, 5)));
    if (p.current?.revealed) {
      const res: PuzzleResult = { band: p.index, timeMs: 0, mistakes: p.current.mistakes, hinted: p.current.hinted, revealed: true };
      const all = [...p.results, res];
      if (all.length >= 5) return record(fiveResult(all));
      update((s) => ({ ...s, five: { ...s.five, progress: { date: today, index: p.index + 1, results: all } } }));
      setResults(all);
      startPuzzle(p.index + 1);
      return;
    }
    setResults(p.results);
    startPuzzle(Math.min(p.index, 4));
    if (p.current) stats.current = { mistakes: p.current.mistakes, hinted: p.current.hinted };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, doneToday, startPuzzle]);

  function saveCurrent(revealed = false) {
    if (test) return;
    update((s) => ({ ...s, [mode]: { ...s[mode], progress: { date: today, index, results, current: { ...stats.current, revealed } } } }));
  }

  function celebrate(r: DayResult) {
    record(r);
    // Not epoch-guarded: recording the day switches to the done view, which bumps the epoch.
    setTimeout(() => {
      toast(winWord(mode, r), 1800);
      if (r.won) {
        setBounce(true);
        play('complete');
        buzz([20, 40, 20]);
      }
      setTimeout(() => onComplete(r), 1600);
    }, r.won ? 350 : 600);
  }

  function finishFive(revealed: boolean) {
    const timeMs = timer.current.stop();
    const res: PuzzleResult = { band: index, timeMs, mistakes: stats.current.mistakes, hinted: stats.current.hinted, revealed };
    const all = [...results, res];
    setResults(all);
    setPhase(revealed ? 'revealed' : 'solved');
    setHintSq(null);
    setHintTo(null);
    if (all.length < 5) {
      if (!test) update((s) => ({ ...s, five: { ...s.five, progress: { date: today, index: index + 1, results: all } } }));
      return;
    }
    celebrate(fiveResult(all));
  }

  function finishSolo(solved: boolean) {
    const timeMs = timer.current.stop();
    setPhase(solved ? 'solved' : 'revealed');
    celebrate(soloResult(stats.current.mistakes, solved, timeMs, stats.current.hinted));
  }

  // Plays the rest of the solution at reading pace, drawing an arrow before each of the player's moves.
  function playSolution(onEnd: () => void) {
    const r = run.current!;
    setPhase('revealing');
    setHintSq(null);
    setHintTo(null);
    const stepOnce = () => {
      const from = r.hint();
      if (!from) return onEnd();
      const playIt = () => {
        setHintSq(null);
        setHintTo(null);
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

  function onReplay() {
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

  function onMove(from: Sq, to: Sq) {
    const r = run.current!;
    if (phase !== 'play') return;
    const res = r.tryMove(from, to);
    if (res === 'illegal') return;
    if (res === 'wrong') {
      stats.current.mistakes++;
      setShake((s) => ({ sq: from, n: (s?.n ?? 0) + 1 }));
      play('wrong');
      buzz([30, 0, 30]);
      bump();
      if (solo) {
        const used = stats.current.mistakes;
        setMisses(used);
        if (used >= MAX_TRIES) {
          saveCurrent(true);
          toast('Out of tries');
          later(700, () => playSolution(() => finishSolo(false)));
          return;
        }
        saveCurrent();
        toast('Not quite');
        setStatus({ text: `${side(r.player)} to move`, sub: `${MAX_TRIES - used} ${MAX_TRIES - used === 1 ? 'try' : 'tries'} left` });
        return;
      }
      saveCurrent();
      toast('Not quite');
      return;
    }
    sfx(r.lastMove!, r);
    buzz(10);
    setHintSq(null);
    setHintTo(null);
    setShake(null);
    bump();
    if (res === 'solved') {
      later(120, () => play('solved'));
      setStatus({ text: 'Solved' });
      return solo ? finishSolo(true) : finishFive(false);
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
  }

  // First tap outlines the piece to move; second tap draws its path. Then wait for the move.
  function onHint() {
    const r = run.current!;
    if (!hintSq) {
      stats.current.hinted = true;
      saveCurrent();
      setHintSq(r.hint());
    } else {
      setHintTo(r.hintTo());
    }
  }

  function onReveal() {
    saveCurrent(true);
    setStatus({ text: 'The solution was…' });
    playSolution(() => {
      setStatus({ text: 'Solution shown', sub: 'No credit for this one' });
      finishFive(true);
    });
  }

  // ----- tiles: Daily 5 progress, or Solo tries -----
  const history = store[mode].history[today];
  const grid: (Outcome | null)[] = solo
    ? Array.from({ length: MAX_TRIES }, (_, i) =>
        doneToday ? history.grid[i] ?? null : i < misses ? 'miss' : i === misses && phase === 'solved' ? 'clean' : null)
    : Array.from({ length: 5 }, (_, i) => (doneToday ? history.grid[i] : results[i] ? outcomeOf(results[i]) : null));
  const activeTile = doneToday ? -1 : solo ? (phase === 'solved' ? -1 : misses) : results.length < 5 ? index : -1;
  const initial = useRef<(Outcome | null)[] | null>(null);
  initial.current ??= grid; // tiles filled at mount show instantly; later ones flip

  const r = run.current;
  const finished = phase === 'solved' || phase === 'revealed';
  const title = solo ? 'One puzzle · six tries' : `Puzzle ${Math.min(index + 1, 5)} of 5 · ${BAND_NAMES[index]}`;
  // Solo end states explain the puzzle: its idea, the full solution, and a replay.
  const failing = solo && phase === 'revealing' && !replaying;
  const ended = solo && (finished || phase === 'done' || replaying);
  const won = phase === 'solved' || (phase === 'done' && !!history?.won);
  const idea = themeLabel(set[index]?.themes ?? '');

  return (
    <>
      <div className={`tiles ${solo ? 'six' : 'five'}${bounce ? ' bounce' : ''}`} role="list" aria-label={solo ? 'Tries' : 'Today’s puzzles'}>
        {grid.map((o, i) => (
          <span
            key={i}
            role="listitem"
            className={`tile${o ? ` ${o}${initial.current![i] === o ? '' : ' flip'}` : ''}${i === activeTile ? ' active' : ''}`}
            style={{ animationDelay: bounce ? `${i * 100}ms` : undefined }}
            aria-label={`${solo ? 'Try' : 'Puzzle'} ${i + 1}: ${o ?? (i === activeTile ? 'current' : 'empty')}`}
          >
            {solo ? '' : i + 1}
          </span>
        ))}
      </div>
      <p className="subtitle">{ended || failing ? `The idea: ${idea}` : doneToday ? 'Today’s 5 are done' : title}</p>

      <main className="stage">
        {r && (
          <Board
            run={r}
            version={version}
            orientation={r.player}
            coords={store.settings.coords}
            hintSq={hintSq}
            hintTo={hintTo}
            shake={shake}
            interactive={phase === 'play'}
            onMove={onMove}
          />
        )}
      </main>

      <footer className="strip">
        {ended || failing ? (
          <>
            <p className="status" aria-live="polite">
              <span className="status-text">
                <b>{won && !failing ? 'Solved' : 'Out of tries'}</b>
                <small className="solution">{failing ? 'Watch the solution…' : `Solution: ${r?.solution().join(' ')}`}</small>
              </span>
            </p>
            <div className="keys">
              <button type="button" className="key" onClick={onReplay} disabled={phase === 'revealing'}>Replay</button>
              <button type="button" className="key" onClick={onShowStats}>Stats</button>
            </div>
          </>
        ) : phase === 'done' ? (
          <>
            <p className="status">
              <span className="status-text"><b>Next puzzle in</b><small><Countdown /></small></span>
            </p>
            <button type="button" className="key wide" onClick={onShowStats}>Stats</button>
          </>
        ) : (
          <>
            <p className="status" aria-live="polite">
              {r && <span className={`disc ${r.turn()}`} aria-hidden="true" />}
              <span className="status-text"><b>{status.text}</b>{status.sub && <small>{status.sub}</small>}</span>
            </p>
            <div className="keys">
              {finished && !solo ? (
                index < 4 ? (
                  <button type="button" className="key go" onClick={() => startPuzzle(index + 1)}>Next</button>
                ) : (
                  <button type="button" className="key wide" onClick={onShowStats}>Stats</button>
                )
              ) : finished ? (
                <button type="button" className="key wide" onClick={onShowStats}>Stats</button>
              ) : (
                <>
                  {!store.settings.hard && (
                    <button type="button" className="key" onClick={onHint} disabled={phase !== 'play' || !!hintTo}
                      aria-label={hintSq ? 'Hint: show the path' : 'Hint: show the piece to move'}>
                      Hint
                    </button>
                  )}
                  {!solo && <button type="button" className="key" onClick={onReveal} disabled={phase !== 'play'}>Show me</button>}
                </>
              )}
            </div>
          </>
        )}
      </footer>
    </>
  );
}
