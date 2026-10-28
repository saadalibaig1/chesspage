import { DEFAULT_SETTINGS, load, loadIfAvailable, loadProgress, recordDay, save } from './storage';
import type { DayResult } from './results';

const day: DayResult = { n: 4, grid: [], hinted: false, timeMs: 1 };

beforeEach(() => {
  const m = new Map<string, string>();
  (globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
});

test('defaults: ladder mode, first practice level, no timer best', () => {
  expect(load()).toMatchObject({ introSeen: false, mode: 'ladder', settings: DEFAULT_SETTINGS, ladder: { history: {} }, practice: { level: 0 }, timer: { history: {} } });
});

test('save/load round-trips', () => {
  const s = load();
  s.introSeen = true;
  s.mode = 'timer';
  s.ladder.history['2026-10-23'] = day;
  s.timer.history['2026-10-23'] = { solved: true, ms: 1000 };
  save(s);
  expect(load()).toMatchObject({ introSeen: true, mode: 'timer', ladder: { history: { '2026-10-23': day } }, timer: { history: { '2026-10-23': { solved: true, ms: 1000 } } } });
});

test('load returns default when localStorage throws', () => {
  (globalThis as any).localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  expect(load().introSeen).toBe(false);
  expect(() => save(load())).not.toThrow();
});

test('loadProgress ignores other dates and keeps the current step', () => {
  const s = load();
  s.ladder.progress = { date: '2026-10-22', index: 2, results: [] };
  expect(loadProgress(s, '2026-10-23')).toEqual({ date: '2026-10-23', index: 0, results: [] });
  const current = { mistakes: 1, hinted: true, failed: false, tried: ['x|e2e4'] };
  s.ladder.progress = { date: '2026-10-23', index: 2, results: [], current };
  expect(loadProgress(s, '2026-10-23').current).toEqual(current);
});

test('recordDay writes history and clears progress', () => {
  const s = load();
  s.ladder.progress = { date: '2026-10-23', index: 5, results: [] };
  const next = recordDay(s, '2026-10-23', day);
  expect(next.ladder).toEqual({ history: { '2026-10-23': day } });
  expect(s.ladder.history['2026-10-23']).toBeUndefined();
});

test('loadIfAvailable returns null when storage is blocked or empty', () => {
  expect(loadIfAvailable()).toBeNull();
  save({ ...load(), introSeen: true });
  expect(loadIfAvailable()?.introSeen).toBe(true);
  (globalThis as any).localStorage = { getItem: () => { throw new Error('denied'); } };
  expect(loadIfAvailable()).toBeNull();
});
