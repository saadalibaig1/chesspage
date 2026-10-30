import { LADDER_SIZE } from './daily';
import { TRIES, type DayResult, type Mode, type TimerResult } from './results';

export type Settings = { hard: boolean; contrast: boolean; sound: boolean; coords: boolean; testMode: boolean };
/** A ladder level in play. tried = wrong moves already made (they don't use a try twice). */
export type Current = { mistakes: number; hinted: boolean; tried?: string[] };
/** Today's levels in play, by level index. Finished levels live in history. */
export type Progress = { date: string; current: Record<number, Current> };
export type Store = {
  introSeen: boolean;
  mode: Mode;
  settings: Settings;
  ladder: { history: Record<string, DayResult>; progress?: Progress };
  /** progress = a run in play: time used and wrong moves so far, so a reload resumes the clock. */
  timer: { history: Record<string, TimerResult>; progress?: { date: string; elapsed: number; tried?: string[] } };
};

const KEY = 'chesspage:v3';
const MODES: Mode[] = ['ladder', 'timer'];
export const DEFAULT_SETTINGS: Settings = { hard: false, contrast: false, sound: true, coords: true, testMode: false };

const fresh = (): Store => ({
  introSeen: false,
  mode: 'ladder',
  settings: { ...DEFAULT_SETTINGS },
  ladder: { history: {} },
  timer: { history: {} },
});

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const base = fresh();
    const ladder = { ...base.ladder, ...s.ladder };
    // Progress from the old in-order ladder (it has an index) is dropped.
    return {
      introSeen: s.introSeen ?? base.introSeen,
      mode: MODES.includes(s.mode) ? s.mode : base.mode, // a removed mode (Practice) falls back to Daily
      settings: { ...base.settings, ...s.settings },
      ladder: { history: migrate(ladder.history), ...(ladder.progress && !('index' in ladder.progress) && { progress: ladder.progress }) },
      timer: { ...base.timer, ...s.timer },
    };
  } catch {
    return fresh();
  }
}

type OldDay = { n: number; grid: ('solved' | 'failed')[] };

/** Days saved when the ladder was climbed in order (a grid of steps) become per-level results. */
function migrate(history: Record<string, DayResult | OldDay>): Record<string, DayResult> {
  return Object.fromEntries(Object.entries(history).map(([d, r]) => [d, 'levels' in r ? r : {
    n: r.n,
    levels: Array.from({ length: LADDER_SIZE }, (_, i) =>
      r.grid[i] ? { mistakes: r.grid[i] === 'failed' ? TRIES : 0, hinted: false, failed: r.grid[i] === 'failed', timeMs: 0 } : null),
  }]));
}

/** The persisted store, or null when storage is blocked or empty (so callers keep their in-memory state). */
export function loadIfAvailable(): Store | null {
  try {
    if (!localStorage.getItem(KEY)) return null;
  } catch {
    return null;
  }
  return load();
}

export function save(s: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked (private mode): play on without persistence
  }
}

export function loadProgress(s: Store, today: string): Progress {
  const p = s.ladder.progress;
  return p?.date === today ? p : { date: today, current: {} };
}

/** Saves the day after level i finished, and drops that level from progress. */
export function recordDay(s: Store, today: string, result: DayResult, i: number): Store {
  const { [i]: _, ...current } = loadProgress(s, today).current;
  return { ...s, ladder: { history: { ...s.ladder.history, [today]: result }, progress: { date: today, current } } };
}
