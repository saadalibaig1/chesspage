import { useEffect, useRef, useState } from 'react';
import { RankedDay, type LevelView } from '../lib/ranked';
import { api } from '../lib/api';
import { SolutionLine, Stage, StatusLine } from './Parts';
import { usePuzzle } from './usePuzzle';
import { LADDER_SIZE, LEVELS, type Puzzle } from '../lib/daily';
import type { Sq } from '../lib/puzzle';
import { emptyDay, levelWord, TRIES, triesLeft, withLevel, type DayResult, type LevelResult } from '../lib/results';
import { loadProgress, recordDay, type Current, type Store } from '../lib/storage';
import { themeLabel } from '../lib/themes';
import { levelPath, levelShareText, parseLink } from '../lib/links';
import { shareOrCopy } from '../lib/share';
import { Icon } from './Icon';
import { buzz, play } from '../lib/sound';

type Props = {
  set: Puzzle[];
  today: string;
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  /** The level a shared link opened, if any. */
  start: number | null;
  /** Signed in with a profile: send play to the server for the leaderboard. */
  ranked: boolean;
  test: boolean;
  paused: boolean;
  toast: (msg: string, ms?: number) => void;
  onComplete: (r: DayResult) => void;
  onShowStats: () => void;
};

const FAIL_TOAST_MS = 2500;
const FRESH: Current = { mistakes: 0, hinted: false };

/** The first level not played yet, looking from `from` and wrapping round; -1 when all are done. */
function nextOpen(d: DayResult, from = 0): number {
  for (let k = 0; k < LADDER_SIZE; k++) {
    const i = (from + k) % LADDER_SIZE;
    if (!d.levels[i]) return i;
  }
  return -1;
}

/** The daily ladder: six levels from 1000 to 2000. Play any of them, in any order, with five tries on each. */
export function Ladder({ set, today, store, update, start, ranked, test, paused, toast, onComplete, onShowStats }: Props) {
  const g = usePuzzle(paused);
  const [day, setDay] = useState<DayResult>(() => (!test && store.ladder.history[today]) || emptyDay());
  const [current, setCurrent] = useState<Record<number, Current>>(() => (test ? {} : loadProgress(store, today).current));
  const [sel, setSel] = useState(() => start ?? Math.max(0, nextOpen(day)));
  const [bounce, setBounce] = useState(false);

  const cur = current[sel] ?? FRESH;
  const done = day.levels[sel];

  // Latest values for the server's async answers.
  const now = useRef({ day, current, sel });
  now.current = { day, current, sel };
  const remote = useRef<RankedDay | null>(null);
  /** The server mirror, made on first use: the profile can arrive after the first level opens. */
  const server = () => {
    if (!ranked || test) return null;
    return (remote.current ??= new RankedDay(today, (l) => toast(`Level ${l + 1} won’t count on the leaderboard. Open it again to retry.`, 3000)));
  };

  function open(i: number) {
    setSel(i);
    // Opened from a level link: keep the address on the level in view.
    if (parseLink(location.pathname)) history.replaceState(null, '', levelPath(today, i));
    if (day.levels[i]) return g.show(set[i], true);
    g.start(set[i], current[i]?.tried ?? []);
    server()?.open(i).then((v) => v && sync(i, v));
  }

  /** Picks up what the server already has for a level, such as play on another device. */
  function sync(i: number, v: Pick<LevelView, 'mistakes' | 'hinted' | 'failed' | 'timeMs' | 'done'>) {
    const { day: d, current: c, sel: shown } = now.current;
    if (d.levels[i]) return;
    if (v.done) {
      const next = withLevel(d, i, { mistakes: v.mistakes, hinted: v.hinted, failed: v.failed, timeMs: v.timeMs });
      now.current.day = next;
      setDay(next);
      setCurrent(({ [i]: _, ...rest }) => rest);
      update((s) => recordDay(s, today, next, i));
      if (shown === i) g.show(set[i], true);
      return;
    }
    const mine = c[i] ?? FRESH;
    if (v.mistakes > mine.mistakes) saveCurrent(i, { ...mine, mistakes: v.mistakes, hinted: mine.hinted || v.hinted });
  }

  useEffect(() => {
    const i = start ?? nextOpen(day);
    open(i < 0 ? LADDER_SIZE - 1 : i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once signed in, show today's levels already finished on another device.
  useEffect(() => {
    if (!ranked || test) return;
    type Me = { history: { date: string; level: number; mistakes: number; hinted: boolean; failed: boolean; timeMs: number }[] };
    api<Me>('/me')
      .then((m) => m.history.filter((h) => h.date === today).forEach((h) => sync(h.level, { ...h, done: true })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked]);

  function saveCurrent(i: number, c: Current) {
    setCurrent((all) => ({ ...all, [i]: c }));
    if (!test) {
      update((s) => ({ ...s, ladder: { ...s.ladder, progress: { date: today, current: { ...loadProgress(s, today).current, [i]: c } } } }));
    }
  }

  function finishLevel(i: number, r: LevelResult) {
    const next = withLevel(day, i, r);
    setDay(next);
    setCurrent(({ [i]: _, ...rest }) => rest);
    if (!test) update((s) => recordDay(s, today, next, i));
    toast(levelWord(r), 2000);
    if (nextOpen(next) >= 0) return;
    // All six played: celebrate, then show the stats.
    if (next.n > 0) play('complete');
    if (next.n === LADDER_SIZE) {
      setBounce(true);
      buzz([20, 40, 20]);
    }
    setTimeout(() => onComplete(next), 1800);
  }

  function onMove(from: Sq, to: Sq) {
    const i = sel;
    const res = g.move(from, to);
    if (res === 'correct' || res === 'wrong' || res === 'solved') server()?.move(i, from, to, res);
    if (res === 'repeat') {
      toast('Already tried that', FAIL_TOAST_MS);
      g.setStatus({ text: 'Already tried that', sub: 'No try used', bad: true });
      return;
    }
    if (res === 'wrong') {
      const m = cur.mistakes + 1;
      const left = triesLeft(m);
      if (left === 0) {
        g.setPhase('revealing'); // no more moves; the solution plays next
        finishLevel(i, { mistakes: m, hinted: cur.hinted, failed: true, timeMs: g.elapsed() });
        g.later(900, () => g.playSolution(() => g.setPhase('failed')));
        return;
      }
      saveCurrent(i, { mistakes: m, hinted: cur.hinted, tried: g.run?.tried() ?? [] });
      toast('Not quite', FAIL_TOAST_MS);
      g.setStatus({ text: 'Not quite', sub: `${left} ${left === 1 ? 'try' : 'tries'} left`, bad: true });
      return;
    }
    if (res === 'solved') finishLevel(i, { mistakes: cur.mistakes, hinted: cur.hinted, failed: false, timeMs: g.elapsed() });
  }

  async function onShare() {
    if ((await shareOrCopy(levelShareText(location.origin, today, sel))) === 'copied') toast('Link copied');
  }

  function onHint() {
    if (!g.hint()) return;
    saveCurrent(sel, { ...cur, hinted: true, tried: g.run?.tried() ?? [] });
    server()?.hint(sel);
  }

  const outcome = (i: number) => {
    const l = day.levels[i];
    return l ? (l.failed ? 'failed' : 'solved') : null;
  };
  const initial = useRef<(string | null)[] | null>(null);
  initial.current ??= day.levels.map((_, i) => outcome(i)); // tiles finished at mount show instantly; later ones flip

  const following = nextOpen(day, sel + 1);
  const title = !done ? '' : done.failed ? 'Out of tries' : done.mistakes ? `Solved on try ${done.mistakes + 1}` : 'Solved on the first try';
  const left = triesLeft(cur.mistakes);

  return (
    <>
      <div className={`tiles pick${bounce ? ' bounce' : ''}`} role="group" aria-label="Today’s levels: pick any">
        {set.map((_, i) => {
          const o = outcome(i);
          return (
            <button
              key={i}
              type="button"
              className={`tile${o ? ` ${o}${initial.current![i] === o ? '' : ' flip'}` : ''}${i === sel ? ' active' : ''}`}
              style={{ animationDelay: bounce ? `${i * 100}ms` : undefined }}
              aria-pressed={i === sel}
              aria-label={`Level ${LEVELS[i]}: ${o ?? (current[i] ? 'in play' : 'not played')}`}
              onClick={() => i !== sel && open(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className={`subtitle${done ? '' : ' level'}`}>
        {done ? (
          `The idea: ${themeLabel(set[sel].themes)}`
        ) : (
          <>
            Level {sel + 1} · <b>{LEVELS[sel]}</b> Elo
            <span className="tries" aria-label={`${left} of ${TRIES} tries left`}>
              {Array.from({ length: TRIES }, (_, i) => <span key={i} className={i < left ? 'on' : ''} />)}
            </span>
          </>
        )}
      </p>

      <Stage g={g} coords={store.settings.coords} onMove={onMove} />

      <footer className="strip">
        {done ? (
          <>
            <SolutionLine g={g} title={title} />
            <div className="keys">
              <button type="button" className="key link" onClick={onShare} aria-label={`Share a link to level ${sel + 1}`}>
                <Icon name="share" size={20} />
              </button>
              <button type="button" className="key" onClick={g.replay} disabled={g.phase === 'revealing'}>Replay</button>
              {following >= 0 ? (
                <button type="button" className="key go" onClick={() => open(following)} disabled={g.phase === 'revealing' && !g.replaying}>
                  Next
                </button>
              ) : (
                <button type="button" className="key" onClick={onShowStats}>Stats</button>
              )}
            </div>
          </>
        ) : (
          <>
            <StatusLine g={g} />
            <div className="keys">
              <button type="button" className="key link" onClick={onShare} aria-label={`Share a link to level ${sel + 1}`}>
                <Icon name="share" size={20} />
              </button>
              {!store.settings.hard && (
                <button type="button" className="key" onClick={onHint} disabled={g.phase !== 'play' || !!g.hintTo}
                  aria-label={g.hintSq ? 'Hint: show the path' : 'Hint: show the piece to move'}>
                  Hint
                </button>
              )}
            </div>
          </>
        )}
      </footer>
    </>
  );
}
