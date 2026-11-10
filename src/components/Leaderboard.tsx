import { useEffect, useState, type FormEvent } from 'react';
import { Sheet } from './Sheet';
import { api, devUser, setDevUser, type Board, type BoardRow, type Profile } from '../lib/api';
import { COUNTRIES, countryName, flag, isCountry } from '../lib/countries';
import { formatTime } from '../lib/results';

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

function CountrySelect({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <select className="select" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
      {COUNTRIES.map((c) => <option key={c} value={c}>{`${flag(c)} ${countryName(c)}`}</option>)}
    </select>
  );
}

function Row({ r, you }: { r: BoardRow; you: boolean }) {
  const misses = `${r.mistakes} ${r.mistakes === 1 ? 'miss' : 'misses'}`;
  return (
    <li className={you ? 'you' : undefined}>
      <span className="place num">{r.rank}</span>
      <span className="who">
        <b>{flag(r.country)} {r.username}</b>
        <small>{r.solved ? `${misses} · ${formatTime(r.timeMs)}` : misses}{r.hinted ? ' · 💡' : ''}</small>
      </span>
      <span className="score num">{r.solved}/{r.played}</span>
    </li>
  );
}

type Props = { today: string; profile: Profile | null; onClose: () => void };

/** Today's board for a country, or the world. Guests can look; signed-in players appear on it. */
export function LeaderboardModal({ today, profile, onClose }: Props) {
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
      .then((b) => live && setBoard(b))
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
      {tab === 'country' && <CountrySelect value={country} onChange={pick} label="Country board" />}

      {error ? (
        <p className="center muted small">{error}</p>
      ) : !board ? (
        <p className="center muted small">Loading…</p>
      ) : board.rows.length === 0 ? (
        <p className="center muted small">No one has played yet today. Be the first.</p>
      ) : (
        <>
          <p className="center muted small">{board.players} {board.players === 1 ? 'player' : 'players'} · levels solved</p>
          <ol className="board-list">
            {board.rows.map((r) => <Row key={r.username} r={r} you={r.username === profile?.username} />)}
            {board.you && !youShown && <li className="gap" aria-hidden="true">⋯</li>}
            {board.you && !youShown && <Row r={board.you} you />}
          </ol>
        </>
      )}
      {!profile?.username && <p className="center muted small">Sign in to appear on the leaderboard.</p>}
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

  if (!devUser()) {
    return (
      <Sheet title="Account" onClose={onClose}>
        <h3 className="caps">Account</h3>
        {import.meta.env.DEV ? (
          <form className="form" onSubmit={(e) => (e.preventDefault(), dev.trim() && (setDevUser(dev.trim()), onSaved(null), onClose()))}>
            <label><span>Test sign-in (dev only)</span><input value={dev} onChange={(e) => setDev(e.target.value)} placeholder="any name" data-autofocus /></label>
            <button type="submit" className="key go wide">Sign in</button>
          </form>
        ) : (
          <p className="center muted small">Sign-in is coming soon.</p>
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
        <label>
          <span>Country</span>
          <CountrySelect value={country} onChange={setCountry} label="Your country" />
          <small>If you already played today, a change counts from tomorrow.</small>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="key go wide" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
      <button type="button" className="link-button" onClick={() => (setDevUser(null), onSaved(null), onClose())}>Sign out</button>
    </Sheet>
  );
}
