import { Board } from './Board';
import type { Sq } from '../lib/puzzle';
import type { usePuzzle } from './usePuzzle';

type G = ReturnType<typeof usePuzzle>;

export function Stage({ g, coords, onMove }: { g: G; coords: boolean; onMove: (from: Sq, to: Sq) => void }) {
  const r = g.run;
  return (
    <main className="stage">
      {r && (
        <Board
          run={r}
          version={g.version}
          orientation={r.player}
          coords={coords}
          hintSq={g.hintSq}
          hintTo={g.hintTo}
          shake={g.shake}
          interactive={g.phase === 'play'}
          onMove={onMove}
        />
      )}
    </main>
  );
}

/** Side to move and the current message. A wrong-move message stays until the next move. */
export function StatusLine({ g }: { g: G }) {
  const { status } = g;
  return (
    <p className="status" aria-live="polite">
      {g.run && <span className={`disc ${g.run.turn()}`} aria-hidden="true" />}
      <span className="status-text">
        <b className={status.bad ? 'bad' : undefined}>{status.text}</b>
        {status.sub && <small>{status.sub}</small>}
      </span>
    </p>
  );
}

/** End state: a headline and the full solution (or a note while it plays). */
export function SolutionLine({ g, title }: { g: G; title: string }) {
  const watching = g.phase === 'revealing' && !g.replaying;
  return (
    <p className="status" aria-live="polite">
      <span className="status-text">
        <b>{title}</b>
        <small className="solution">{watching ? 'Watch the solution…' : `Solution: ${g.run?.solution().join(' ')}`}</small>
      </span>
    </p>
  );
}
