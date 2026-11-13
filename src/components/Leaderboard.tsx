import { useEffect, useState, type FormEvent } from 'react';
import { Sheet } from './Sheet';
import { api, setDevUser, signedIn, signInWithGoogle, signOut, type Board, type BoardRow, type Profile } from '../lib/api';
import { flag, isCountry } from '../lib/countries';
import { CountryPicker } from './CountryPicker';

const PICK_KEY = 'chesspage:board-country';

/** The country board a guest last looked at, else a guess from the browser language. */
function startCountry(profile: Profile | null): string {
  if (profile?.country) return profile.country;
  try {
    const saved = localStorage.getItem(PICK_KEY);
    if (saved && isCountry(saved)) return saved;
  } catch {
    /* ignore */
  }
  const region = navigator.language.split('-')[1]?.toUpperCase() ?? '';
  return isCountry(region) ? region : 'US';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One player: name, levels solved, points. */
function Row({ r, you }: { r: BoardRow; you: boolean }) {
  return (
    <li className={you ? 'you' : undefined} aria-label={`${r.rank}. ${r.username}${you ? ' (you)' : ''}: ${r.solved} of ${r.played} solved, ${r.score} points`}>
      <b className="who" aria-hidden="true">{r.username}</b>
      <span className="solved num" aria-hidden="true">{r.solved}/{r.played}</span>
      <span className="score num" aria-hidden="true">{r.score.toLocaleString('en-US')}</span>
    </li>
  );
}

type Props = { today: string; profile: Profile | null; onSignIn?: () => void; onClose: () => void };

/** Today's board for a country, or the world. Guests can look; signed-in players appear on it. onSignIn is unset while sign-in is hidden. */
export function LeaderboardModal({ today, profile, onSignIn, onClose }: Props) {
  const [tab, setTab] = useState<'country' | 'world'>('country');
  const [country, setCountry] = useState(() => startCountry(profile));
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setBoard(null);
    setError('');
    const q = tab === 'country' ? `&country=${country}` : '';
    api<Board>(`/board?date=${today}${q}`)
      .then((b) => {
        if (!Array.isArray(b.rows)) throw new Error('Couldn’t load the leaderboard.');
        if (live) setBoard(b);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [tab, country, today]);

  function pick(c: string) {
    setCountry(c);
    try {
      localStorage.setItem(PICK_KEY, c);
    } catch {
      /* ignore */
    }
  }

  const youShown = board?.you && board.rows.some((r) => r.username === board.you!.username);
  return (
    <Sheet title="Leaderboard" onClose={onClose}>
      <h3 className="caps">Today’s leaderboard</h3>
      <div className="seg" role="tablist" aria-label="Board">
        <button type="button" role="tab" aria-selected={tab === 'country'} className={tab === 'country' ? 'on' : ''} onClick={() => setTab('country')}>
          {flag(country)} Country
        </button>
        <button type="button" role="tab" aria-selected={tab === 'world'} className={tab === 'world' ? 'on' : ''} onClick={() => setTab('world')}>
          🌍 World
        </button>
      </div>
      {tab === 'country' && <CountryPicker value={country} onChange={pick} label="Country board" />}

      {error ? (
        <p className="center muted small">{error}</p>
      ) : !board ? (
        <p className="center muted small">Loading…</p>
      ) : board.rows.length === 0 ? (
        <p className="center muted small">{onSignIn ? 'No one has played yet today. Be the first.' : 'No one on the board yet today.'}</p>
      ) : (
        <>
          <p className="center muted small">{plural(board.players, 'player', 'players')} today</p>
          <div className="board-head" aria-hidden="true"><span>Player</span><span>Solved</span><span>Score</span></div>
          <ol className="board-list">
            {board.rows.map((r) => <Row key={r.username} r={r} you={r.username === profile?.username} />)}
            {board.you && !youShown && <li className="gap" aria-hidden="true">⋯</li>}
            {board.you && !youShown && <Row r={board.you} you />}
          </ol>
          <p className="center muted small">Each level is worth 100 to 600 points by its Elo. A wrong move takes off 20%, a hint 30%.</p>
        </>
      )}
      {onSignIn && !profile?.username && (
        <button type="button" className="link-button" onClick={onSignIn}>Sign in to appear on the leaderboard</button>
      )}
    </Sheet>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** "Sign in with Google": one key, with the reason to sign in. */
function SignInPanel() {
  const [error, setError] = useState('');
  async function go() {
    setError('');
    try {
      await signInWithGoogle();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="signin">
      <p className="lead center">Save your streak on every device and join your country’s leaderboard.</p>
      <button type="button" className="google" onClick={go} data-autofocus>
        <GoogleMark /> Sign in with Google
      </button>
      {error && <p className="error center" role="alert">{error}</p>}
      <p className="center muted small">Optional. You can always play without an account.</p>
    </div>
  );
}

/** Shown once, after the first finished level. */
export function SignInModal({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Sign in" onClose={onClose}>
      <h3 className="caps">Keep your streak</h3>
      <SignInPanel />
      <button type="button" className="link-button" onClick={onClose}>Not now</button>
    </Sheet>
  );
}

type AccountProps = { profile: Profile | null; onSaved: (p: Profile | null) => void; onClose: () => void };

/** Username and country. In dev builds it also offers a test sign-in by name. */
export function AccountModal({ profile, onSaved, onClose }: AccountProps) {
  const [name, setName] = useState(profile?.username ?? '');
  const [country, setCountry] = useState(() => startCountry(profile));
  const [dev, setDev] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSaved(await api<Profile>('/me', { username: name.trim(), country }));
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn()) {
    return (
      <Sheet title="Account" onClose={onClose}>
        <h3 className="caps">Account</h3>
        <SignInPanel />
        {import.meta.env.DEV && (
          <form className="form" onSubmit={(e) => (e.preventDefault(), dev.trim() && setDevUser(dev.trim()))}>
            <label><span>Test sign-in (dev only)</span><input value={dev} onChange={(e) => setDev(e.target.value)} placeholder="any name" /></label>
            <button type="submit" className="key wide">Test sign-in</button>
          </form>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title="Account" onClose={onClose}>
      <h3 className="caps">Your profile</h3>
      <form className="form" onSubmit={save}>
        <label>
          <span>Username</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={15} autoComplete="nickname" autoCapitalize="none" spellCheck={false} data-autofocus />
          <small>3–15 letters, numbers or _. Others see this on the leaderboard.</small>
        </label>
        <div className="field">
          <span>Country</span>
          <CountryPicker value={country} onChange={setCountry} label="Your country" />
          <small>If you already played today, a change counts from tomorrow.</small>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="key go wide" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
      <button type="button" className="link-button" onClick={() => (signOut(), onClose())}>Sign out</button>
    </Sheet>
  );
}
