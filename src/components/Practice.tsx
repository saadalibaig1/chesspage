import { useEffect, useState } from 'react';
import { SolutionLine, Stage, StatusLine } from './Parts';
import { usePuzzle } from './usePuzzle';
import { LEVELS, randomPuzzle, type Pool, type Puzzle } from '../lib/daily';
import type { Sq } from '../lib/puzzle';
import { formatTime, practiceNext } from '../lib/results';
import type { Store } from '../lib/storage';
import { themeLabel } from '../lib/themes';

type Props = {
  pool: Pool;
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  paused: boolean;
  toast: (msg: string, ms?: number) => void;
};

/** Pick a level and solve as many as you like. Not counted in stats. */
export function Practice({ pool, store, update, paused, toast }: Props) {
  const g = usePuzzle(paused);
  const level = store.practice.level;
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [clean, setClean] = useState(true); // no miss and no hint so far
  const [solved, setSolved] = useState(0);

  function deal(l: number) {
    const p = randomPuzzle(pool, l);
    setPuzzle(p);
    setClean(true);
    g.start(p);
  }

  useEffect(() => deal(level), []); // eslint-disable-line react-hooks/exhaustive-deps

  function setLevel(l: number) {
    update((s) => ({ ...s, practice: { level: l } }));
    deal(l);
  }

  function onMove(from: Sq, to: Sq) {
    const res = g.move(from, to);
    if (res === 'repeat') {
      toast('Already tried that', 2500);
      g.setStatus({ text: 'Already tried that', sub: 'Try another move', bad: true });
    } else if (res === 'wrong') {
      setClean(false);
      toast('Not quite', 2500);
      g.setStatus({ text: 'Not quite', sub: 'Try again', bad: true });
    } else if (res === 'solved') {
      const ms = g.elapsed();
      setSolved((n) => n + 1);
      g.setStatus({ text: `Solved in ${formatTime(ms)}`, sub: `The idea: ${themeLabel(puzzle?.themes ?? '')}` });
      const next = practiceNext(level, ms, clean);
      if (next > level) {
        update((s) => ({ ...s, practice: { level: next } }));
        toast(`Quick solve! Up to ${LEVELS[next]}`, 2500);
      }
    }
  }

  function onHint() {
    g.hint();
    setClean(false);
  }

  const showing = g.phase === 'revealing' || g.phase === 'failed';
  const done = g.phase === 'solved' || g.phase === 'failed' || g.replaying;

  return (
    <>
      <div className="topline">
        <label className="level">
          <span>Level</span>
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} aria-label="Puzzle level">
            {LEVELS.map((r, i) => <option key={r} value={i}>{r}</option>)}
          </select>
        </label>
      </div>
      <p className="subtitle">
        {showing ? `The idea: ${themeLabel(puzzle?.themes ?? '')}` : `Practice · ${solved} solved · not counted`}
      </p>

      <Stage g={g} coords={store.settings.coords} onMove={onMove} />

      <footer className="strip">
        {showing ? <SolutionLine g={g} title="Solution shown" /> : <StatusLine g={g} />}
        <div className="keys">
          {done ? (
            <>
              {g.phase !== 'solved' && (
                <button type="button" className="key" onClick={g.replay} disabled={g.phase === 'revealing'}>Replay</button>
              )}
              <button type="button" className="key go" onClick={() => deal(store.practice.level)}>Next</button>
            </>
          ) : (
            <>
              {!store.settings.hard && (
                <button type="button" className="key" onClick={onHint} disabled={g.phase !== 'play' || !!g.hintTo}
                  aria-label={g.hintSq ? 'Hint: show the path' : 'Hint: show the piece to move'}>
                  Hint
                </button>
              )}
              <button type="button" className="key" onClick={() => g.playSolution(() => g.setPhase('failed'))}
                disabled={g.phase !== 'play'}>
                Show me
              </button>
            </>
          )}
        </div>
      </footer>
    </>
  );
}
