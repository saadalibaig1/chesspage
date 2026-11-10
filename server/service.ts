import pool from '../src/data/puzzles.json' with { type: 'json' };
import { dailyLadder, dailyTimer, dayNumber, LADDER_SIZE, type Pool, type Puzzle } from '../src/lib/daily.js';
import { isCountry } from '../src/lib/countries.js';
import { TIMER_MS, TRIES } from '../src/lib/results.js';
import { fresh, hintFor, judge, played, type LevelState } from './judge.js';
import { checkUsername, dateAllowed, rank, type BoardRow } from './rules.js';

export type User = { id: string; uid: string; name: string; email: string; username: string | null; country: string | null };
export type NewUser = Pick<User, 'uid' | 'name' | 'email' | 'country'>;
export type LevelRow = LevelState & { startedAt: number; timeMs: number };
export type TimerRow = LevelState & { startedAt: number; ms: number };

/** Storage the service needs. Postgres in production (pg.ts), memory in tests (memory.ts). */
export interface Repo {
  findUser(uid: string): Promise<User | null>;
  addUser(u: NewUser): Promise<User>;
  /** 'taken' when another user has the username (case doesn't matter). */
  setProfile(id: string, p: { username?: string; country?: string }): Promise<'ok' | 'taken'>;
  level(id: string, date: string, level: number): Promise<LevelRow | null>;
  saveLevel(id: string, date: string, level: number, row: LevelRow): Promise<void>;
  /** Fixes the player's country for that day at their first play; later calls keep the first one. */
  lockDay(id: string, date: string, country: string): Promise<void>;
  timer(id: string, date: string): Promise<TimerRow | null>;
  saveTimer(id: string, date: string, row: TimerRow): Promise<void>;
  /** One row per player who played that day, on that country's board (null = all countries). */
  boardRows(date: string, country: string | null): Promise<BoardRow[]>;
  history(id: string): Promise<{ date: string; level: number; row: LevelRow }[]>;
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** A Timer solve may arrive a moment after the minute, because of the network. */
const GRACE_MS = 2000;
const BOARD_SIZE = 50;
const POOL = pool as unknown as Pool;

function checkDate(date: string, now: number) {
  if (!dateAllowed(date, new Date(now))) throw new HttpError(400, 'That day isn’t available.');
}

function ladder(date: string, level: number): Puzzle {
  if (!Number.isInteger(level) || level < 0 || level >= LADDER_SIZE) throw new HttpError(400, 'No such level.');
  return dailyLadder(date, POOL)[level];
}

function player(u: User): User & { username: string; country: string } {
  if (!u.username || !u.country) throw new HttpError(403, 'Choose a username and country first.');
  return u as User & { username: string; country: string };
}

/** Today's levels without their solutions. The Timer puzzle comes only when its clock starts. */
export function day(date: string, now = Date.now()) {
  checkDate(date, now);
  return {
    date,
    day: dayNumber(date),
    levels: dailyLadder(date, POOL).map((p) => ({ fen: p.fen, setup: p.moves[0], steps: Math.ceil((p.moves.length - 1) / 2), rating: p.rating })),
  };
}

function levelView(p: Puzzle, row: LevelRow) {
  return {
    moves: played(p, row),
    mistakes: row.mistakes,
    left: TRIES - row.mistakes,
    hinted: row.hinted,
    done: row.done,
    failed: row.failed,
    timeMs: row.timeMs,
    ...(row.done && { solution: p.moves, themes: p.themes }),
  };
}

async function levelRow(repo: Repo, u: User, date: string, level: number, now: number) {
  const me = player(u);
  checkDate(date, now);
  const p = ladder(date, level);
  let row = await repo.level(me.id, date, level);
  if (!row) {
    row = { ...fresh(), startedAt: now, timeMs: 0 };
    await repo.lockDay(me.id, date, me.country);
    await repo.saveLevel(me.id, date, level, row);
  }
  return { me, p, row };
}

/** Starts a level, or restarts it at the setup move as the game does (mistakes and time carry on). */
export async function open(repo: Repo, u: User, date: string, level: number, now = Date.now()) {
  const { me, p, row } = await levelRow(repo, u, date, level, now);
  if (row.done || row.ply === 0) return levelView(p, row);
  const restarted = { ...row, ply: 0 };
  await repo.saveLevel(me.id, date, level, restarted);
  return levelView(p, restarted);
}

export async function move(repo: Repo, u: User, date: string, level: number, from: string, to: string, now = Date.now()) {
  const { me, p, row } = await levelRow(repo, u, date, level, now);
  const j = judge(p, row, String(from), String(to));
  if (j.state !== row) {
    const next: LevelRow = { ...row, ...j.state, timeMs: j.state.done ? now - row.startedAt : row.timeMs };
    await repo.saveLevel(me.id, date, level, next);
  }
  return { result: j.result, reply: j.reply, left: j.left, ...(j.state.done && { solution: p.moves, themes: p.themes, mistakes: j.state.mistakes }) };
}

export async function hint(repo: Repo, u: User, date: string, level: number, now = Date.now()) {
  const { me, p, row } = await levelRow(repo, u, date, level, now);
  if (row.done) throw new HttpError(409, 'That level is finished.');
  if (!row.hinted) await repo.saveLevel(me.id, date, level, { ...row, hinted: true });
  return hintFor(p, row);
}

function timerView(p: Puzzle, row: TimerRow, now: number) {
  return {
    fen: p.fen,
    moves: played(p, row),
    elapsed: Math.min(now - row.startedAt, TIMER_MS),
    done: row.done,
    solved: row.done && !row.failed,
    ms: row.ms,
    ...(row.done && { solution: p.moves, themes: p.themes }),
  };
}

/** Starts the Timer clock on the server, or resumes the run. */
export async function timerStart(repo: Repo, u: User, date: string, now = Date.now()) {
  const me = player(u);
  checkDate(date, now);
  const p = dailyTimer(date, POOL);
  let row = await repo.timer(me.id, date);
  if (!row) {
    row = { ...fresh(), startedAt: now, ms: 0 };
    await repo.saveTimer(me.id, date, row);
  } else if (!row.done && row.ply > 0) {
    // A resume restarts at the setup move, as the game does; the clock keeps running.
    row = { ...row, ply: 0 };
    await repo.saveTimer(me.id, date, row);
  }
  return timerView(p, row, now);
}

export async function timerMove(repo: Repo, u: User, date: string, from: string, to: string, now = Date.now()) {
  const me = player(u);
  checkDate(date, now);
  const p = dailyTimer(date, POOL);
  const row = await repo.timer(me.id, date);
  if (!row) throw new HttpError(409, 'Start the clock first.');
  if (row.done) return { result: 'illegal' as const };
  const elapsed = now - row.startedAt;
  if (elapsed > TIMER_MS + GRACE_MS) {
    await repo.saveTimer(me.id, date, { ...row, done: true, failed: true, ms: TIMER_MS });
    return { result: 'timeout' as const, solution: p.moves, themes: p.themes };
  }
  const j = judge(p, row, String(from), String(to), Infinity);
  if (j.state !== row) {
    const ms = j.state.done ? Math.min(elapsed, TIMER_MS) : 0;
    await repo.saveTimer(me.id, date, { ...row, ...j.state, ms });
  }
  return { result: j.result, reply: j.reply, ...(j.state.done && { solution: p.moves, themes: p.themes, ms: Math.min(elapsed, TIMER_MS) }) };
}

export async function me(repo: Repo, u: User) {
  const rows = await repo.history(u.id);
  return {
    username: u.username,
    country: u.country,
    history: rows.filter((r) => r.row.done).map(({ date, level, row }) => ({ date, level, mistakes: row.mistakes, hinted: row.hinted, failed: row.failed, timeMs: row.timeMs })),
  };
}

export async function setProfile(repo: Repo, u: User, p: { username?: unknown; country?: unknown }) {
  const next: { username?: string; country?: string } = {};
  if (p.username !== undefined) {
    const name = String(p.username).trim();
    const why = checkUsername(name);
    if (why) throw new HttpError(400, why);
    next.username = name;
  }
  if (p.country !== undefined) {
    if (!isCountry(String(p.country))) throw new HttpError(400, 'Choose a country from the list.');
    next.country = String(p.country);
  }
  if ((await repo.setProfile(u.id, next)) === 'taken') throw new HttpError(409, 'That username is taken.');
  return { username: next.username ?? u.username, country: next.country ?? u.country };
}

/** A day's board: the top players, plus your own place when you played. */
export async function board(repo: Repo, date: string, country: string | null, u: User | null, now = Date.now()) {
  checkDate(date, now);
  if (country !== null && !isCountry(country)) throw new HttpError(400, 'No such country.');
  const all = rank((await repo.boardRows(date, country)).filter((r) => r.played > 0)).map((r, i) => ({ rank: i + 1, ...r }));
  return {
    date,
    country,
    players: all.length,
    rows: all.slice(0, BOARD_SIZE),
    you: (u?.username && all.find((r) => r.username === u.username)) || null,
  };
}
