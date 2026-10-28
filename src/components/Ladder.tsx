import { useEffect, useRef, useState } from 'react';
import { SolutionLine, Stage, StatusLine } from './Parts';
import { usePuzzle } from './usePuzzle';
import { LADDER_SIZE, LEVELS, type Puzzle } from '../lib/daily';
import type { Sq } from '../lib/puzzle';
import { ladderResult, livesLeft, LIVES, winWord, type DayResult, type Outcome, type PuzzleResult } from '../lib/results';
import { loadProgress, recordDay, type Current, type Store } from '../lib/storage';
import { themeLabel } from '../lib/themes';
import { buzz, play } from '../lib/sound';

type Props = {
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

const FAIL_TOAST_MS = 2500;

/** The daily ladder: six puzzles from 1000 to 2000, three lives for the whole climb. */
export function Ladder({ set, today, store, update, test, paused, toast, onComplete, onShowStats }: Props) {
  const g = usePuzzle(paused);
  const history = test ? undefined : store.ladder.history[today];
  const [index, setIndex] = useState(() => (history ? history.grid.length - 1 : 0));
  const [results, setResults] = useState<PuzzleResult[]>([]);
  const [mistakes, setMistakes] = useState(0); // on the current step
  const [hinted, setHinted] = useState(false);
  const [over, setOver] = useState<DayResult | null>(null);
  const [bounce, setBounce] = useState(false);

  function startStep(i: number, c?: Current) {
    setIndex(i);
    setMistakes(c?.mistakes ?? 0);
    setHinted(c?.hinted ?? false);
    g.start(set[i], c?.tried ?? []);
  }

  const record = (r: DayResult) => {
    if (!test) update((s) => recordDay(s, today, r));
  };

  function saveProgress(p: { index: number; results: PuzzleResult[]; current?: Current }) {
    if (!test) update((s) => ({ ...s, ladder: { ...s.ladder, progress: { date: today, ...p } } }));
  }

  const saveCurrent = (c: Omit<Current, 'tried'>) =>
    saveProgress({ index, results, current: { ...c, tried: g.run?.tried() ?? [] } });

  // Enter the right state for today: resume, settle an interrupted fail, or show the finished day.
  useEffect(() => {
    if (history) {
      setIndex(history.grid.length - 1);
      g.show(set[history.grid.length - 1], true);
      return;
    }
    if (test) return startStep(0);
    const p = loadProgress(store, today);
    if (p.current?.failed) {
      const step: PuzzleResult = { level: p.index, timeMs: 0, mistakes: p.current.mistakes, hinted: p.current.hinted, failed: true };
      return record(ladderResult([...p.results, step]));
    }
    if (p.results.length >= LADDER_SIZE) return record(ladderResult(p.results));
    setResults(p.results);
    startStep(p.index, p.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, !!history]);

  function finish(all: PuzzleResult[]) {
    const r = ladderResult(all);
    setOver(r);
    record(r);
    // Not epoch-guarded: recording the day switches to the done view, which starts a new epoch.
    setTimeout(() => {
      toast(winWord(r), 2000);
      if (r.n > 0) play('complete');
      if (r.n === LADDER_SIZE) {
        setBounce(true);
        buzz([20, 40, 20]);
      }
      setTimeout(() => onComplete(r), 1600);
    }, 400);
  }

  function onMove(from: Sq, to: Sq) {
    const res = g.move(from, to);
    if (res === 'repeat') {
      toast('Already tried that', FAIL_TOAST_MS);
      g.setStatus({ text: 'Already tried that', sub: 'No life lost', bad: true });
      return;
    }
    if (res === 'wrong') {
      const m = mistakes + 1;
      const left = livesLeft(results, m);
      setMistakes(m);
      if (left === 0) {
        saveCurrent({ mistakes: m, hinted, failed: true });
        toast('Out of lives', FAIL_TOAST_MS);
        g.setStatus({ text: 'Out of lives', bad: true });
        const step: PuzzleResult = { level: index, timeMs: g.elapsed(), mistakes: m, hinted, failed: true };
        g.later(900, () => g.playSolution(() => finish([...results, step])));
        return;
      }
      saveCurrent({ mistakes: m, hinted, failed: false });
      toast('Not quite', FAIL_TOAST_MS);
      g.setStatus({ text: 'Not quite', sub: `${left} ${left === 1 ? 'life' : 'lives'} left`, bad: true });
      return;
    }
    if (res === 'solved') {
      const all = [...results, { level: index, timeMs: g.elapsed(), mistakes, hinted, failed: false }];
      setResults(all);
      if (all.length === LADDER_SIZE) return finish(all);
      saveProgress({ index: index + 1, results: all });
      g.setStatus({ text: 'Solved', sub: `Next: ${LEVELS[index + 1]}` });
    }
  }

  function onHint() {
    if (g.hint()) {
      setHinted(true);
      saveCurrent({ mistakes, hinted: true, failed: false });
    }
  }

  // ----- tiles: one per step -----
  const grid: (Outcome | null)[] = Array.from({ length: LADDER_SIZE }, (_, i) =>
    history ? history.grid[i] ?? null : results[i] ? (results[i].failed ? 'failed' : 'solved') : null);
  const ended = !!history || !!over;
  const failing = g.phase === 'revealing' && !g.replaying;
  const activeTile = ended || g.phase === 'solved' ? -1 : index;
  const initial = useRef<(Outcome | null)[] | null>(null);
  initial.current ??= grid; // tiles filled at mount show instantly; later ones flip

  const lives = livesLeft(results, mistakes);
  const final = history ?? over;
  const idea = themeLabel(set[index]?.themes ?? '');

  return (
    <>
      <div className={`tiles${bounce ? ' bounce' : ''}`} role="list" aria-label="Today’s ladder">
        {grid.map((o, i) => (
          <span
            key={i}
            role="listitem"
            className={`tile${o ? ` ${o}${initial.current![i] === o ? '' : ' flip'}` : ''}${i === activeTile ? ' active' : ''}`}
            style={{ animationDelay: bounce ? `${i * 100}ms` : undefined }}
            aria-label={`Puzzle ${i + 1}, ${LEVELS[i]}: ${o ?? (i === activeTile ? 'current' : 'not reached')}`}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <p className="subtitle">
        {ended || failing ? (
          `The idea: ${idea}`
        ) : (
          <>
            Puzzle {index + 1} of {LADDER_SIZE} · {LEVELS[index]}
            <span className="lives" aria-label={`${lives} of ${LIVES} lives left`}>
              {Array.from({ length: LIVES }, (_, i) => <span key={i} className={i < lives ? 'on' : ''}>♥</span>)}
            </span>
          </>
        )}
      </p>

      <Stage g={g} coords={store.settings.coords} onMove={onMove} />

      <footer className="strip">
        {failing ? (
          <SolutionLine g={g} title="Out of lives" />
        ) : ended ? (
          <>
            <SolutionLine g={g} title={final ? `Climbed ${final.n}/${LADDER_SIZE}` : ''} />
            <div className="keys">
              <button type="button" className="key" onClick={g.replay} disabled={g.phase === 'revealing'}>Replay</button>
              <button type="button" className="key" onClick={onShowStats}>Stats</button>
            </div>
          </>
        ) : (
          <>
            <StatusLine g={g} />
            <div className="keys">
              {g.phase === 'solved' ? (
                <button type="button" className="key go" onClick={() => startStep(index + 1)}>Next</button>
              ) : (
                !store.settings.hard && (
                  <button type="button" className="key" onClick={onHint} disabled={g.phase !== 'play' || !!g.hintTo}
                    aria-label={g.hintSq ? 'Hint: show the path' : 'Hint: show the piece to move'}>
                    Hint
                  </button>
                )
              )}
            </div>
          </>
        )}
      </footer>
    </>
  );
}
