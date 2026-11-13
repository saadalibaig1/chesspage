import pool from '../src/data/puzzles.json';
import { dailyLadder, dailyTimer, type Pool } from '../src/lib/daily';
import { memoryRepo } from './memory';
import { board, day, hint, HttpError, me, move, open, setProfile, timerMove, timerStart, type Repo, type User } from './service';

const DATE = '2026-11-10';
const NOW = Date.parse('2026-11-10T12:00:00Z');
const ladder = dailyLadder(DATE, pool as unknown as Pool);
const sq = (u: string) => [u.slice(0, 2), u.slice(2, 4)] as const;

async function player(repo: Repo, uid: string, username: string, country: string): Promise<User> {
  const u = await repo.addUser({ uid, name: uid, email: `${uid}@x.test`, country: null });
  await setProfile(repo, u, { username, country });
  return (await repo.findUser(uid))!;
}

/** Plays a level's solution from the start; `wrong` wrong moves first. */
async function solve(repo: Repo, u: User, level: number, now: number, opts: { wrong?: number; hint?: boolean } = {}) {
  const p = ladder[level];
  await open(repo, u, DATE, level, now);
  if (opts.hint) await hint(repo, u, DATE, level, now);
  for (let k = 0, w = 0; w < (opts.wrong ?? 0) && k < 64; k++) {
    const from = 'abcdefgh'[k % 8] + (1 + Math.floor(k / 8));
    for (const to of ['a1', 'h8', 'd4', 'e5', 'a8', 'h1']) {
      if (from + to === p.moves[1].slice(0, 4)) continue;
      const r = await move(repo, u, DATE, level, from, to, now);
      if (r.result === 'wrong') { w++; break; }
    }
  }
  let last;
  for (let i = 1; i < p.moves.length; i += 2) last = await move(repo, u, DATE, level, ...sq(p.moves[i]), now + 30_000);
  return last!;
}

const err = (p: Promise<unknown>, status: number) => expect(p).rejects.toSatisfy((e) => e instanceof HttpError && e.status === status);

describe('day', () => {
  it('sends today’s six levels without their solutions', () => {
    const d = day(DATE, NOW);
    expect(d.levels).toHaveLength(6);
    expect(d.levels[0]).toEqual({ fen: ladder[0].fen, setup: ladder[0].moves[0], steps: expect.any(Number), rating: ladder[0].rating });
    expect(JSON.stringify(d)).not.toContain(ladder[0].moves[1]);
  });
  it('refuses past days', () => {
    expect(() => day('2026-11-01', NOW)).toThrow(HttpError);
  });
});

describe('playing a level', () => {
  it('needs a username and country first', async () => {
    const repo = memoryRepo();
    const u = await repo.addUser({ uid: 'g1', name: 'A', email: 'a@x.test', country: null });
    await err(open(repo, u, DATE, 0, NOW), 403);
  });

  it('solves, records the time, and hides the solution until done', async () => {
    const repo = memoryRepo();
    const u = await player(repo, 'g1', 'alice', 'PK');
    const first = await open(repo, u, DATE, 0, NOW);
    expect(first).not.toHaveProperty('solution');
    expect(first.moves).toEqual([ladder[0].moves[0]]);
    const r = await solve(repo, u, 0, NOW);
    expect(r.result).toBe('solved');
    expect(r.solution).toEqual(ladder[0].moves);
    const again = await open(repo, u, DATE, 0, NOW + 60_000);
    expect(again).toMatchObject({ done: true, failed: false, timeMs: 30_000 });
    expect((await me(repo, u)).history).toEqual([{ date: DATE, level: 0, mistakes: 0, hinted: false, failed: false, timeMs: 30_000 }]);
  });

  it('reopening a level restarts it at the setup move but keeps its mistakes, like the game', async () => {
    const repo = memoryRepo();
    const u = await player(repo, 'g1', 'alice', 'PK');
    const p = ladder[0];
    await open(repo, u, DATE, 0, NOW);
    await move(repo, u, DATE, 0, ...sq(p.moves[1]), NOW);
    await repo.saveLevel(u.id, DATE, 0, { ...(await repo.level(u.id, DATE, 0))!, mistakes: 2 });
    const again = await open(repo, u, DATE, 0, NOW);
    expect(again).toMatchObject({ moves: [p.moves[0]], mistakes: 2 });
    expect((await move(repo, u, DATE, 0, ...sq(p.moves[1]), NOW)).result).not.toBe('wrong');
  });

  it('refuses past days and unknown levels', async () => {
    const repo = memoryRepo();
    const u = await player(repo, 'g1', 'alice', 'PK');
    await err(open(repo, u, '2026-11-05', 0, NOW), 400);
    await err(open(repo, u, DATE, 6, NOW), 400);
  });

  it('a hint marks the level and gives the move squares', async () => {
    const repo = memoryRepo();
    const u = await player(repo, 'g1', 'alice', 'PK');
    const h = await hint(repo, u, DATE, 1, NOW);
    expect(h).toEqual({ from: ladder[1].moves[1].slice(0, 2), to: ladder[1].moves[1].slice(2, 4) });
    expect((await open(repo, u, DATE, 1, NOW)).hinted).toBe(true);
  });
});

describe('profile', () => {
  it('checks the username and country, and keeps usernames unique', async () => {
    const repo = memoryRepo();
    await player(repo, 'g1', 'Alice', 'PK');
    const b = await repo.addUser({ uid: 'g2', name: 'B', email: 'b@x.test', country: null });
    await err(setProfile(repo, b, { username: 'alice' }), 409);
    await err(setProfile(repo, b, { username: 'a b' }), 400);
    await err(setProfile(repo, b, { country: 'XX' }), 400);
    expect(await setProfile(repo, b, { username: 'bob', country: 'IN' })).toEqual({ username: 'bob', country: 'IN' });
  });
});

describe('board', () => {
  it('ranks players and keeps each on the country of their first play that day', async () => {
    const repo = memoryRepo();
    const a = await player(repo, 'g1', 'alice', 'PK');
    const b = await player(repo, 'g2', 'bob', 'PK');
    const c = await player(repo, 'g3', 'carol', 'IN');
    await solve(repo, a, 0, NOW, { wrong: 1 });
    await solve(repo, b, 0, NOW);
    await solve(repo, b, 1, NOW, { hint: true });
    await solve(repo, c, 0, NOW);
    // Moving country after playing doesn't move today's score.
    await setProfile(repo, a, { country: 'IN' });

    const pk = await board(repo, DATE, 'PK', a, NOW);
    expect(pk.rows.map((r) => [r.rank, r.username, r.solved])).toEqual([[1, 'bob', 2], [2, 'alice', 1]]);
    expect(pk.you).toMatchObject({ rank: 2, username: 'alice', mistakes: 1 });
    // Each row carries the result of every level, for the small tiles on the board.
    expect(pk.rows[0].levels).toEqual(['solved', 'hinted', null, null, null, null]);
    expect(pk.you!.levels).toEqual(['solved', null, null, null, null, null]);

    const world = await board(repo, DATE, null, null, NOW);
    expect(world.rows.map((r) => r.username)).toEqual(['bob', 'carol', 'alice']);
    expect(world.you).toBeNull();
  });
});

describe('timer', () => {
  const t = dailyTimer(DATE, pool as unknown as Pool);

  it('times a solve from the server clock', async () => {
    const repo = memoryRepo();
    const u = await player(repo, 'g1', 'alice', 'PK');
    const s = await timerStart(repo, u, DATE, NOW);
    expect(s).toMatchObject({ elapsed: 0, done: false, moves: [t.moves[0]] });
    expect(s).not.toHaveProperty('solution');
    let r;
    for (let i = 1; i < t.moves.length; i += 2) r = await timerMove(repo, u, DATE, ...sq(t.moves[i]), NOW + 20_000);
    expect(r).toMatchObject({ result: 'solved', ms: 20_000 });
    expect(await timerStart(repo, u, DATE, NOW + 90_000)).toMatchObject({ done: true, solved: true, ms: 20_000 });
  });

  it('resuming restarts at the setup move but keeps the clock', async () => {
    const repo = memoryRepo();
    const u = await player(repo, 'g1', 'alice', 'PK');
    await timerStart(repo, u, DATE, NOW);
    await timerMove(repo, u, DATE, ...sq(t.moves[1]), NOW + 5_000);
    expect(await timerStart(repo, u, DATE, NOW + 10_000)).toMatchObject({ moves: [t.moves[0]], elapsed: 10_000 });
  });

  it('ends the run after the minute', async () => {
    const repo = memoryRepo();
    const u = await player(repo, 'g1', 'alice', 'PK');
    await timerStart(repo, u, DATE, NOW);
    expect(await timerMove(repo, u, DATE, ...sq(t.moves[1]), NOW + 63_000)).toMatchObject({ result: 'timeout' });
    expect(await timerStart(repo, u, DATE, NOW + 70_000)).toMatchObject({ done: true, solved: false });
  });
});
