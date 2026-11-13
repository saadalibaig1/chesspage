import { Footer } from './Privacy';

type Props = {
  today: string;
  /** Shown only while sign-in is on and the player is signed out. */
  onLogin?: () => void;
  error?: string;
  onPlay: () => void;
};

const longDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** The front page on every visit: the app icon, the name, one line about the game, Log in and Play, and today's date. */
export function Splash({ today, onLogin, error, onPlay }: Props) {
  return (
    <main className="splash">
      <svg className="splash-logo" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#769656" />
        <rect x="32" width="32" height="32" fill="#eeeed2" />
        <rect y="32" width="32" height="32" fill="#eeeed2" />
        <circle cx="32" cy="32" r="13" fill="#fff" stroke="#262421" strokeWidth="4" />
      </svg>
      <h1 className="splash-title">ChessPage</h1>
      <p className="splash-tag">Six chess puzzles a day.<br />Five tries each.</p>
      <div className="splash-keys">
        {onLogin && <button type="button" className="pill" onClick={onLogin}>Log in</button>}
        <button type="button" className="pill dark" onClick={onPlay} autoFocus>Play</button>
      </div>
      {error && <p className="splash-error" role="alert">{error}</p>}
      <p className="splash-date">{longDate(today)}</p>
      <Footer />
    </main>
  );
}
