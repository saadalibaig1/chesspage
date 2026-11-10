import { RankedDay, RankedTimer } from './ranked';

type Call = { path: string; body: Record<string, unknown> };

/** Fakes fetch: answers each request from `reply`, slowly, so ordering is tested. */
function fakeServer(reply: (c: Call) => unknown | Error) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const c = { path: url, body: JSON.parse(String(init.body)) };
    calls.push(c);
    await new Promise((r) => setTimeout(r, Math.random() * 5));
    const out = reply(c);
    if (out instanceof Error) throw out;
    return new Response(JSON.stringify(out), { status: 200 });
  }) as typeof fetch;
  return calls;
}

const flush = () => new Promise((r) => setTimeout(r, 40));

describe('RankedDay', () => {
  it('sends open, moves and hints for a level in order', async () => {
    const calls = fakeServer((c) => (c.body.action === 'move' ? { result: 'correct' } : {}));
    const lost: number[] = [];
    const d = new RankedDay('2026-11-10', (l) => lost.push(l));
    d.open(2);
    d.move(2, 'e2', 'e4', 'correct');
    d.hint(2);
    d.move(2, 'g1', 'f3', 'correct');
    await flush();
    expect(calls.map((c) => [c.body.action, c.body.from ?? ''])).toEqual([['open', ''], ['move', 'e2'], ['hint', ''], ['move', 'g1']]);
    expect(calls.every((c) => c.path === '/api/play' && c.body.date === '2026-11-10' && c.body.level === 2)).toBe(true);
    expect(lost).toEqual([]);
  });

  it('stops counting a level when the server disagrees, until it is opened again', async () => {
    const calls = fakeServer((c) => (c.body.action === 'move' ? { result: 'wrong' } : { moves: [] }));
    const lost: number[] = [];
    const d = new RankedDay('2026-11-10', (l) => lost.push(l));
    d.move(0, 'e2', 'e4', 'correct');
    d.move(0, 'd2', 'd4', 'correct');
    await flush();
    expect(lost).toEqual([0]);
    expect(calls).toHaveLength(1);
    d.open(0);
    d.move(0, 'c2', 'c4', 'wrong');
    await flush();
    expect(calls.map((c) => c.body.action)).toEqual(['move', 'open', 'move']);
    expect(lost).toEqual([0]);
  });

  it('a failed level on the server matches a local last wrong move', async () => {
    fakeServer(() => ({ result: 'failed' }));
    const lost: number[] = [];
    const d = new RankedDay('2026-11-10', (l) => lost.push(l));
    d.move(1, 'e2', 'e4', 'wrong');
    await flush();
    expect(lost).toEqual([]);
  });

  it('stops counting a level when a request fails', async () => {
    fakeServer(() => new Error('offline'));
    const lost: number[] = [];
    const d = new RankedDay('2026-11-10', (l) => lost.push(l));
    d.move(3, 'e2', 'e4', 'correct');
    await flush();
    expect(lost).toEqual([3]);
  });

  it('gives the open result back, to pick up progress from another device', async () => {
    fakeServer(() => ({ moves: ['e2e4'], mistakes: 2, done: false }));
    const d = new RankedDay('2026-11-10', () => {});
    expect(await d.open(0)).toMatchObject({ mistakes: 2 });
  });
});

describe('RankedTimer', () => {
  it('starts the server clock, then sends moves', async () => {
    const calls = fakeServer((c) => (c.body.action === 'move' ? { result: 'solved' } : { elapsed: 0 }));
    let lost = false;
    const t = new RankedTimer('2026-11-10', () => (lost = true));
    t.start();
    t.move('e2', 'e4', 'solved');
    await flush();
    expect(calls.map((c) => [c.path, c.body.action])).toEqual([['/api/timer', 'start'], ['/api/timer', 'move']]);
    expect(lost).toBe(false);
  });
});
