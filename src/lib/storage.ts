import type { DayResult, Mode, PuzzleResult, TimerResult } from './results';

export type Settings = { hard: boolean; contrast: boolean; sound: boolean; coords: boolean; testMode: boolean };
/** The ladder step in progress. tried = wrong moves already made (they don't cost a life twice). */
export type Current = { mistakes: number; hinted: boolean; failed: boolean; tried?: string[] };
/** index = ladder step; results = finished steps. */
export type Progress = { date: string; index: number; results: PuzzleResult[]; current?: Current };
export type Store = {
  introSeen: boolean;
  mode: Mode;
  country?: string;
  settings: Settings;
  ladder: { history: Record<string, DayResult>; progress?: Progress };
  practice: { level: number };
  /** progress = a run in play: time used and wrong moves so far, so a reload resumes the clock. */
  timer: { history: Record<string, TimerResult>; progress?: { date: string; elapsed: number; tried?: string[] } };
};

const KEY = 'chesspage:v3';
export const DEFAULT_SETTINGS: Settings = { hard: false, contrast: false, sound: true, coords: true, testMode: false };

const fresh = (): Store => ({
  introSeen: false,
  mode: 'ladder',
  settings: { ...DEFAULT_SETTINGS },
  ladder: { history: {} },
  practice: { level: 0 },
  timer: { history: {} },
});

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const base = fresh();
    return {
      ...base, ...s,
      settings: { ...base.settings, ...s.settings },
      ladder: { ...base.ladder, ...s.ladder },
      practice: { ...base.practice, ...s.practice },
      timer: { ...base.timer, ...s.timer },
    };
  } catch {
    return fresh();
  }
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
  return p?.date === today ? p : { date: today, index: 0, results: [] };
}

export function recordDay(s: Store, today: string, result: DayResult): Store {
  return { ...s, ladder: { history: { ...s.ladder.history, [today]: result } } };
}
