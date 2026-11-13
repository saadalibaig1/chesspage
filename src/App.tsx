import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ladder } from './components/Ladder';
import { TimerMode } from './components/TimerMode';
import { Icon } from './components/Icon';
import { PieceSprite } from './components/pieces';
import { HelpModal, SettingsModal, StatsModal } from './components/Modals';
import { dailyLadder, dailyTimer, dayNumber, localDateKey, msUntilMidnight, randomLadder, randomPuzzle, TIMER_LEVEL, type Pool, type Puzzle } from './lib/daily';
import type { DayResult, Mode } from './lib/results';
import { load, loadIfAvailable, save, type Settings, type Store } from './lib/storage';
import { setSoundEnabled, unlockAudio } from './lib/sound';
import { parseLink } from './lib/links';
import { SIGNIN, api, loginAsked, onAuthChange, setLoginAsked, signedIn, signInWithGoogle, startAuth, type Profile } from './lib/api';
import { Splash } from './components/Splash';
import { Footer } from './components/Privacy';
import { countryName, flag } from './lib/countries';
import { AccountModal, LeaderboardModal, SignInModal } from './components/Leaderboard';

type Modal = null | 'help' | 'stats' | 'settings' | 'board' | 'account' | 'signin';
type Toast = { id: number; text: string };

const MODES: [Mode, string][] = [['ladder', 'Daily'], ['timer', 'Timer']];

export default function App() {
  // A level link (/YYYY/MM/DD/N or /N) opens that level of today's Daily; never a past day.
  const [link] = useState(() => parseLink(location.pathname));
  const [linkLevel, setLinkLevel] = useState(() => link?.level ?? null);
  const [store, setStore] = useState<Store>(() => (linkLevel === null ? load() : { ...load(), mode: 'ladder' }));
  const [today, setToday] = useState(localDateKey);
  const [pool, setPool] = useState<Pool | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadTry, setLoadTry] = useState(0);
  const [testNonce, setTestNonce] = useState(0);
  // The front page shows on every visit, except when a level link opens a puzzle straight away.
  const [splash, setSplash] = useState(() => linkLevel === null);
  const [splashError, setSplashError] = useState('');
  const [modal, setModal] = useState<Modal>(store.introSeen || linkLevel === null ? null : 'help');
  const [lastResult, setLastResult] = useState<DayResult | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileNonce, setProfileNonce] = useState(0);

  const mode = store.mode;
  const test = store.settings.testMode;
  const ranked = SIGNIN && !test && !!profile?.username && !!profile.country;

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

  useEffect(() => {
    if (!link?.date || link.date === today) return;
    toast(link.date < today ? 'That puzzle has ended. Here’s today’s.' : 'That puzzle isn’t out here yet. Here’s today’s.', 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sign-in (behind the VITE_SIGNIN flag): reload the profile on every sign-in or sign-out.
  // Signing in from the one-time prompt moves on to the username sheet.
  useEffect(() => {
    if (!SIGNIN) return;
    startAuth();
    return onAuthChange(() => {
      setProfileNonce((n) => n + 1);
      if (signedIn()) setModal((m) => (m === 'signin' ? 'account' : m));
    });
  }, []);

  useEffect(() => {
    if (!SIGNIN || !signedIn()) return setProfile(null);
    api<Profile>('/me').then(setProfile).catch(() => setProfile(null));
  }, [profileNonce]);

  useEffect(() => setSoundEnabled(store.settings.sound), [store.settings.sound]);
  useEffect(() => {
    document.documentElement.classList.toggle('contrast', store.settings.contrast);
  }, [store.settings.contrast]);

  // Coming back to the tab picks up a new day and anything another tab saved.
  useEffect(() => {
    function refresh() {
      if (document.hidden) return;
      const fresh = loadIfAvailable();
      if (fresh) setStore((s) => ({ ...fresh, mode: s.mode })); // the mode on screen stays: a level link may have opened Daily
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
  // After the first finished level, offer sign-in once. Skipped if another sheet is open by then.
  const onLevelDone = useCallback(() => {
    if (!SIGNIN || signedIn() || loginAsked()) return;
    setLoginAsked();
    setTimeout(() => setModal((m) => m ?? 'signin'), 2200);
  }, []);
  const toModal = useCallback((m: Modal) => () => setModal(m), []);

  if (splash) {
    const play = (next: Modal = null) => {
      setSplash(false);
      setModal(next ?? (store.introSeen ? null : 'help'));
    };
    // Log in opens Google's window straight from the tap. A new player then picks a username and country.
    const login = async () => {
      setSplashError('');
      try {
        await signInWithGoogle();
      } catch (e) {
        return setSplashError((e as Error).message);
      }
      const p = await api<Profile>('/me').catch(() => null);
      play(p?.username && p.country ? null : 'account');
    };
    return <Splash today={today} onLogin={SIGNIN && !signedIn() ? login : undefined} error={splashError} onPlay={() => play()} />;
  }

  return (
    <div className="app">
      <PieceSprite />
      <header className="header">
        <div className="side">
          <button type="button" className="icon" onClick={() => setModal('help')} aria-label="How to play">
            <Icon name="help" />
          </button>
          <button type="button" className="icon" onClick={() => setModal('board')} aria-label="Leaderboard">
            <Icon name="trophy" />
          </button>
        </div>
        <h1 className="brand">ChessPage</h1>
        <div className="side right">
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
            onClick={() => {
              if (m !== 'ladder' && linkLevel !== null) {
                setLinkLevel(null);
                history.replaceState(null, '', '/');
              }
              update((s) => ({ ...s, mode: m }));
            }}>
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
          store={store} update={update} test={test} ranked={ranked} paused={modal !== null} toast={toast} />
      ) : (
        <Ladder
          key={`${today}-${test}-${testNonce}`}
          set={ladder!}
          today={today}
          store={store}
          update={update}
          start={linkLevel}
          ranked={ranked}
          test={test}
          paused={modal !== null}
          toast={toast}
          onComplete={onComplete}
          onLevelDone={onLevelDone}
          onShowStats={toModal('stats')}
        />
      )}

      <Footer />
      {modal === 'help' && <HelpModal onClose={closeHelp} />}
      {modal === 'stats' && (
        <StatsModal
          store={store}
          today={today}
          day={dayNumber(today)}
          result={test ? lastResult : null}
          test={test}
          onClose={closeModal}
        />
      )}
      {modal === 'settings' && (
        <SettingsModal
          settings={store.settings}
          onSetting={onSetting}
          onClose={closeModal}
          account={SIGNIN ? {
            label: profile?.username ? `${profile.username} · ${profile.country ? `${flag(profile.country)} ${countryName(profile.country)}` : 'no country'}` : signedIn() ? 'Choose a username' : 'Sign in',
            open: () => setModal('account'),
          } : undefined}
        />
      )}
      {modal === 'signin' && <SignInModal onClose={closeModal} />}
      {modal === 'board' && <LeaderboardModal today={today} profile={profile} onSignIn={SIGNIN ? () => setModal('account') : undefined} onClose={closeModal} />}
      {modal === 'account' && (
        <AccountModal
          key={profile?.username ?? ''} // starts over with the saved name once the profile loads
          profile={profile}
          onSaved={(p) => (p ? setProfile(p) : setProfileNonce((n) => n + 1))}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
