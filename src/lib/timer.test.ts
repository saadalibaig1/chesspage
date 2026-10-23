import { PuzzleTimer } from './timer';

test('counts only time while running and not paused', () => {
  let now = 0;
  const t = new PuzzleTimer(() => now);
  t.start();
  now = 1000;
  t.pause('hidden', true);
  now = 5000; // hidden: not counted
  t.pause('hidden', false);
  now = 6000;
  expect(t.elapsed()).toBe(2000);
});

test('start while paused does not count until every pause is lifted', () => {
  let now = 0;
  const t = new PuzzleTimer(() => now);
  t.pause('modal', true);
  t.pause('hidden', true);
  t.start(); // e.g. opening move played in a background tab behind the intro
  now = 10_000;
  t.pause('hidden', false);
  now = 20_000;
  expect(t.elapsed()).toBe(0);
  t.pause('modal', false);
  now = 23_000;
  expect(t.stop()).toBe(3000);
  now = 50_000;
  expect(t.elapsed()).toBe(3000);
});

test('reset clears time but keeps pause reasons', () => {
  let now = 0;
  const t = new PuzzleTimer(() => now);
  t.pause('modal', true);
  t.start();
  now = 100;
  t.reset();
  t.start();
  now = 200;
  expect(t.elapsed()).toBe(0);
});
