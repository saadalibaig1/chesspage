import { DEFAULT_SETTINGS, load, loadIfAvailable, loadProgress, recordDay, save } from './storage';
import type { DayResult } from './results';

const day: DayResult = { won: true, n: 5, grid: [], timeMs: 1 };

beforeEach(() => {
  const m = new Map<string, string>();
  (globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
});

test('save/load round-trips per mode', () => {
  const s = load();
  expect(s.settings).toEqual(DEFAULT_SETTINGS);
  s.introSeen = true;
  s.five.history['2026-10-23'] = day;
  save(s);
  expect(load()).toMatchObject({ introSeen: true, five: { history: { '2026-10-23': day } }, solo: { history: {} } });
});

test('load returns default when localStorage throws', () => {
  (globalThis as any).localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  expect(load().introSeen).toBe(false);
  expect(() => save(load())).not.toThrow();
});

test('loadProgress ignores other dates and keeps current penalties', () => {
  const s = load();
  s.solo.progress = { date: '2026-10-22', index: 0, results: [] };
  expect(loadProgress(s, 'solo', '2026-10-23')).toEqual({ date: '2026-10-23', index: 0, results: [] });
  s.five.progress = { date: '2026-10-23', index: 2, results: [], current: { mistakes: 2, hinted: true, revealed: false } };
  expect(loadProgress(s, 'five', '2026-10-23').current).toEqual({ mistakes: 2, hinted: true, revealed: false });
});

test('recordDay writes the mode history and clears its progress only', () => {
  const s = load();
  s.five.progress = { date: '2026-10-23', index: 5, results: [] };
  s.solo.progress = { date: '2026-10-23', index: 0, results: [] };
  const next = recordDay(s, 'five', '2026-10-23', day);
  expect(next.five.history['2026-10-23']).toEqual(day);
  expect(next.five.progress).toBeUndefined();
  expect(next.solo.progress).toBeDefined();
  expect(s.five.history['2026-10-23']).toBeUndefined();
});

test('loadIfAvailable returns null when storage is blocked or empty', () => {
  expect(loadIfAvailable()).toBeNull();
  save({ ...load(), introSeen: true });
  expect(loadIfAvailable()?.introSeen).toBe(true);
  (globalThis as any).localStorage = { getItem: () => { throw new Error('denied'); } };
  expect(loadIfAvailable()).toBeNull();
});
