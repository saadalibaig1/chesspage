import type { DayResult, Mode, PuzzleResult } from './results';

export type Settings = { hard: boolean; contrast: boolean; sound: boolean; coords: boolean; testMode: boolean };
export type Current = { mistakes: number; hinted: boolean; revealed: boolean };
/** index = puzzle in the set (Daily 5); Solo uses index 0 and current.mistakes as tries used. */
export type Progress = { date: string; index: number; results: PuzzleResult[]; current?: Current };
export type ModeState = { history: Record<string, DayResult>; progress?: Progress };
export type Store = { introSeen: boolean; mode: Mode; country?: string; settings: Settings; five: ModeState; solo: ModeState };

const KEY = 'chesspage:v2';
export const DEFAULT_SETTINGS: Settings = { hard: false, contrast: false, sound: true, coords: true, testMode: false };

const fresh = (): Store => ({ introSeen: false, mode: 'five', settings: { ...DEFAULT_SETTINGS }, five: { history: {} }, solo: { history: {} } });

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const base = fresh();
    return { ...base, ...s, settings: { ...base.settings, ...s.settings }, five: { ...base.five, ...s.five }, solo: { ...base.solo, ...s.solo } };
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

export function loadProgress(s: Store, mode: Mode, today: string): Progress {
  const p = s[mode].progress;
  return p?.date === today ? p : { date: today, index: 0, results: [] };
}

export function recordDay(s: Store, mode: Mode, today: string, result: DayResult): Store {
  return { ...s, [mode]: { history: { ...s[mode].history, [today]: result }, progress: undefined } };
}
