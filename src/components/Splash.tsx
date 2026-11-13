import { Footer } from './Privacy';
import type { DayProgress } from '../lib/results';

type Props = {
  today: string;
  progress: DayProgress;
  /** The signed-in player's username, if any. */
  name?: string | null;
  /** Shown only while sign-in is on and the player is signed out. */
  onLogin?: () => void;
  error?: string;
  onPlay: () => void;
};

const longDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** The front page on every visit, as on Wordle. A fresh day: icon, name, one line, Log in and Play.
 *  Later in the day it greets the player instead: Continue while levels are left, See results once all six are played. */
export function Splash({ today, progress, name, onLogin, error, onPlay }: Props) {
  const { state, played, solved } = progress;
  return (
    <main className={`splash${state === 'new' ? '' : ' back'}`}>
      <svg className="splash-logo" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#769656" />
        <rect x="32" width="32" height="32" fill="#eeeed2" />
        <rect y="32" width="32" height="32" fill="#eeeed2" />
        <circle cx="32" cy="32" r="13" fill="#fff" stroke="#262421" strokeWidth="4" />
      </svg>
      {state === 'new' ? (
        <>
          <h1 className="splash-title">ChessPage</h1>
          <p className="splash-tag">Six chess puzzles a day.<br />Five tries each.</p>
        </>
      ) : (
        <>
          <p className="splash-brand">ChessPage</p>
          <h1 className="splash-title">{state === 'done' ? `Hi ${name ?? 'there'}` : 'Welcome back'}</h1>
          <p className="splash-tag">
            {state === 'done'
              ? `You solved ${solved} of 6 today. Six new puzzles tomorrow. See you then.`
              : `You’ve played ${played} of 6 levels. Keep it up!`}
          </p>
        </>
      )}
      <div className="splash-keys">
        {onLogin && <button type="button" className="pill" onClick={onLogin}>Log in</button>}
        <button type="button" className="pill dark" onClick={onPlay} autoFocus>
          {state === 'new' ? 'Play' : state === 'progress' ? 'Continue' : 'See results'}
        </button>
      </div>
      {error && <p className="splash-error" role="alert">{error}</p>}
      <p className="splash-date">{longDate(today)}</p>
      <Footer />
    </main>
  );
}
