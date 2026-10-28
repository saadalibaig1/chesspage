import { DEFAULT_SETTINGS, load, loadIfAvailable, loadProgress, recordDay, save } from './storage';
import type { DayResult } from './results';

const day: DayResult = { n: 1, levels: [{ mistakes: 0, hinted: false, failed: false, timeMs: 1 }, null, null, null, null, null] };

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

test('loadProgress ignores other dates and keeps each level in play', () => {
  const s = load();
  s.ladder.progress = { date: '2026-10-22', current: { 2: { mistakes: 1, hinted: false } } };
  expect(loadProgress(s, '2026-10-23')).toEqual({ date: '2026-10-23', current: {} });
  const current = { 1: { mistakes: 1, hinted: true, tried: ['x|e2e4'] }, 4: { mistakes: 3, hinted: false } };
  s.ladder.progress = { date: '2026-10-23', current };
  expect(loadProgress(s, '2026-10-23').current).toEqual(current);
});

test('recordDay writes history and drops only that level from progress', () => {
  const s = load();
  s.ladder.progress = { date: '2026-10-23', current: { 0: { mistakes: 2, hinted: false }, 3: { mistakes: 1, hinted: false } } };
  const next = recordDay(s, '2026-10-23', day, 0);
  expect(next.ladder.history['2026-10-23']).toEqual(day);
  expect(next.ladder.progress).toEqual({ date: '2026-10-23', current: { 3: { mistakes: 1, hinted: false } } });
  expect(s.ladder.history['2026-10-23']).toBeUndefined();
});

test('load converts days saved before levels could be picked freely', () => {
  localStorage.setItem('chesspage:v3', JSON.stringify({ ladder: { history: { '2026-10-28': { n: 2, grid: ['solved', 'solved', 'failed'], hinted: false, timeMs: 1 } } } }));
  const d = load().ladder.history['2026-10-28'];
  expect(d.n).toBe(2);
  expect(d.levels.map((l) => (l ? l.failed : null))).toEqual([false, false, true, null, null, null]);
});

test('loadIfAvailable returns null when storage is blocked or empty', () => {
  expect(loadIfAvailable()).toBeNull();
  save({ ...load(), introSeen: true });
  expect(loadIfAvailable()?.introSeen).toBe(true);
  (globalThis as any).localStorage = { getItem: () => { throw new Error('denied'); } };
  expect(loadIfAvailable()).toBeNull();
});
