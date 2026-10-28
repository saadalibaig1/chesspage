import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ladder } from './components/Ladder';
import { TimerMode } from './components/TimerMode';
import { Icon } from './components/Icon';
import { PieceSprite } from './components/pieces';
import { HelpModal, LeaderboardModal, SettingsModal, StatsModal } from './components/Modals';
import { dailyLadder, dailyTimer, dayNumber, localDateKey, msUntilMidnight, randomLadder, randomPuzzle, TIMER_LEVEL, type Pool, type Puzzle } from './lib/daily';
import type { DayResult, Mode } from './lib/results';
import { load, loadIfAvailable, save, type Settings, type Store } from './lib/storage';
import { detectCountry } from './lib/country';
import { setSoundEnabled, unlockAudio } from './lib/sound';

type Modal = null | 'help' | 'stats' | 'leaderboard' | 'settings';
type Toast = { id: number; text: string };

const MODES: [Mode, string][] = [['ladder', 'Daily'], ['timer', 'Timer']];

export default function App() {
  const [store, setStore] = useState<Store>(load);
  const [today, setToday] = useState(localDateKey);
  const [pool, setPool] = useState<Pool | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadTry, setLoadTry] = useState(0);
  const [testNonce, setTestNonce] = useState(0);
  const [modal, setModal] = useState<Modal>(store.introSeen ? null : 'help');
  const [lastResult, setLastResult] = useState<DayResult | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mode = store.mode;
  const test = store.settings.testMode;
  const country = store.country ?? detectCountry();

  const update = useCallback((fn: (s: Store) => Store) => {
    setStore((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const toast = useCallback((text: string, ms = 1000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);

  useEffect(() => {
    setLoadFailed(false);
    import('./data/puzzles.json')
      .then((m) => setPool(m.default as unknown as Pool))
      .catch(() => setLoadFailed(true));
  }, [loadTry]);

  useEffect(() => setSoundEnabled(store.settings.sound), [store.settings.sound]);
  useEffect(() => {
    document.documentElement.classList.toggle('contrast', store.settings.contrast);
  }, [store.settings.contrast]);

  // Coming back to the tab picks up a new day and anything another tab saved.
  useEffect(() => {
    function refresh() {
      if (document.hidden) return;
      const fresh = loadIfAvailable();
      if (fresh) setStore(fresh);
      if (localDateKey() !== today) setToday(localDateKey());
    }
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('storage', refresh);
    const t = setTimeout(() => setToday(localDateKey()), msUntilMidnight() + 50);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('storage', refresh);
      clearTimeout(t);
    };
  }, [today]);

  // Mobile browsers only start audio from a user gesture.
  useEffect(() => {
    const events = ['pointerup', 'keydown'] as const;
    events.forEach((e) => document.addEventListener(e, unlockAudio, { capture: true }));
    return () => events.forEach((e) => document.removeEventListener(e, unlockAudio, { capture: true }));
  }, []);

  const ladder: Puzzle[] | null = useMemo(() => {
    if (!pool) return null;
    return test ? randomLadder(pool) : dailyLadder(today, pool);
    // testNonce deals a fresh random ladder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, today, test, testNonce]);
  const timerPuzzle: Puzzle | null = useMemo(() => {
    if (!pool) return null;
    return test ? randomPuzzle(pool, TIMER_LEVEL) : dailyTimer(today, pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, today, test, testNonce]);

  function onSetting(k: keyof Settings, v: boolean) {
    update((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
    if (k === 'testMode') setModal(null);
  }

  const closeModal = useCallback(() => setModal(null), []);
  const closeHelp = useCallback(() => {
    setModal(null);
    update((s) => (s.introSeen ? s : { ...s, introSeen: true }));
  }, [update]);

  const onComplete = useCallback((r: DayResult) => {
    setLastResult(r);
    setModal('stats');
  }, []);
  const toModal = useCallback((m: Modal) => () => setModal(m), []);

  return (
    <div className="app">
      <PieceSprite />
      <header className="header">
        <div className="side">
          <button type="button" className="icon" onClick={() => setModal('leaderboard')} aria-label="Leaderboard">
            <Icon name="trophy" />
          </button>
        </div>
        <h1 className="brand">ChessPage</h1>
        <div className="side right">
          <button type="button" className="icon" onClick={() => setModal('help')} aria-label="How to play">
            <Icon name="help" />
          </button>
          <button type="button" className="icon" onClick={() => setModal('stats')} aria-label="Statistics">
            <Icon name="stats" />
          </button>
          <button type="button" className="icon" onClick={() => setModal('settings')} aria-label="Settings">
            <Icon name="gear" />
          </button>
        </div>
      </header>

      <nav className="modes" role="tablist" aria-label="Mode">
        {MODES.map(([m, label]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''}
            onClick={() => update((s) => ({ ...s, mode: m }))}>
            {label}
          </button>
        ))}
      </nav>

      {test && (
        <button type="button" className="chip" onClick={() => setTestNonce((n) => n + 1)} aria-label={`Test mode: deal a new random ${mode === 'ladder' ? 'ladder' : 'puzzle'}`}>
          Test · New {mode === 'ladder' ? 'ladder' : 'puzzle'}
        </button>
      )}

      <div className="toasts" aria-live="assertive">
        {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>

      {!pool ? (
        <div className="loading">
          {loadFailed ? (
            <>
              <p>Couldn’t load puzzles. Check your connection.</p>
              <button type="button" className="key wide" onClick={() => setLoadTry((n) => n + 1)}>Retry</button>
            </>
          ) : (
            <p>Loading puzzles…</p>
          )}
        </div>
      ) : mode === 'timer' ? (
        <TimerMode key={`timer-${today}-${test}-${testNonce}`} puzzle={timerPuzzle!} today={today} day={dayNumber(today)}
          store={store} update={update} test={test} paused={modal !== null} toast={toast} />
      ) : (
        <Ladder
          key={`${today}-${test}-${testNonce}`}
          set={ladder!}
          today={today}
          store={store}
          update={update}
          test={test}
          paused={modal !== null}
          toast={toast}
          onComplete={onComplete}
          onShowStats={toModal('stats')}
        />
      )}

      {modal === 'help' && <HelpModal onClose={closeHelp} />}
      {modal === 'stats' && (
        <StatsModal
          store={store}
          today={today}
          day={dayNumber(today)}
          result={test ? lastResult : null}
          test={test}
          onClose={closeModal}
          onLeaderboard={() => setModal('leaderboard')}
        />
      )}
      {modal === 'leaderboard' && (
        <LeaderboardModal date={today} country={country} store={store}
          onCountry={(iso) => update((s) => ({ ...s, country: iso }))} onClose={closeModal} />
      )}
      {modal === 'settings' && <SettingsModal settings={store.settings} onSetting={onSetting} onClose={closeModal} />}
    </div>
  );
}
