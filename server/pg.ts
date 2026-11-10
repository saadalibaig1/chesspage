import { neon } from '@neondatabase/serverless';
import type { BoardRow } from './rules.js';
import type { LevelRow, Repo, TimerRow, User } from './service.js';

type Row = Record<string, unknown>;

const user = (r: Row): User => ({
  id: String(r.id), uid: String(r.uid), name: String(r.name), email: String(r.email),
  username: (r.username as string | null) ?? null, country: (r.country as string | null) ?? null,
});

const state = (r: Row) => ({
  ply: Number(r.ply), tried: r.tried as string[], mistakes: Number(r.mistakes),
  hinted: Boolean(r.hinted), done: Boolean(r.done), failed: Boolean(r.failed), startedAt: Number(r.started),
});

/** The Repo on Neon Postgres. */
export function pgRepo(url = process.env.DATABASE_URL!): Repo {
  const sql = neon(url);
  return {
    async findUser(uid) {
      const [r] = await sql`select * from users where uid = ${uid}`;
      return r ? user(r) : null;
    },
    async addUser(u) {
      const [r] = await sql`insert into users (uid, name, email, country) values (${u.uid}, ${u.name}, ${u.email}, ${u.country})
        on conflict (uid) do update set uid = excluded.uid returning *`;
      return user(r);
    },
    async setProfile(id, p) {
      try {
        await sql`update users set username = coalesce(${p.username ?? null}, username), country = coalesce(${p.country ?? null}, country) where id = ${id}`;
        return 'ok';
      } catch (e) {
        if ((e as { code?: string }).code === '23505') return 'taken';
        throw e;
      }
    },
    async level(id, date, level) {
      const [r] = await sql`select *, extract(epoch from started_at) * 1000 as started from plays where user_id = ${id} and date = ${date} and level = ${level}`;
      return r ? ({ ...state(r), timeMs: Number(r.time_ms) } as LevelRow) : null;
    },
    async saveLevel(id, date, level, s) {
      await sql`insert into plays (user_id, date, level, ply, tried, mistakes, hinted, done, failed, started_at, time_ms)
        values (${id}, ${date}, ${level}, ${s.ply}, ${JSON.stringify(s.tried)}, ${s.mistakes}, ${s.hinted}, ${s.done}, ${s.failed}, to_timestamp(${s.startedAt / 1000}), ${s.timeMs})
        on conflict (user_id, date, level) do update set ply = excluded.ply, tried = excluded.tried, mistakes = excluded.mistakes,
          hinted = excluded.hinted, done = excluded.done, failed = excluded.failed, time_ms = excluded.time_ms`;
    },
    async lockDay(id, date, country) {
      await sql`insert into days (user_id, date, country) values (${id}, ${date}, ${country}) on conflict do nothing`;
    },
    async timer(id, date) {
      const [r] = await sql`select *, extract(epoch from started_at) * 1000 as started from timer_plays where user_id = ${id} and date = ${date}`;
      return r ? ({ ...state(r), ms: Number(r.ms) } as TimerRow) : null;
    },
    async saveTimer(id, date, s) {
      await sql`insert into timer_plays (user_id, date, ply, tried, mistakes, hinted, done, failed, started_at, ms)
        values (${id}, ${date}, ${s.ply}, ${JSON.stringify(s.tried)}, ${s.mistakes}, ${s.hinted}, ${s.done}, ${s.failed}, to_timestamp(${s.startedAt / 1000}), ${s.ms})
        on conflict (user_id, date) do update set ply = excluded.ply, tried = excluded.tried, mistakes = excluded.mistakes,
          hinted = excluded.hinted, done = excluded.done, failed = excluded.failed, ms = excluded.ms`;
    },
    async boardRows(date, country) {
      const rows = await sql`
        select u.username, d.country,
          count(*) filter (where p.done)::int as played,
          count(*) filter (where p.done and not p.failed)::int as solved,
          count(*) filter (where p.done and not p.failed and p.hinted)::int as hinted,
          coalesce(sum(p.mistakes) filter (where p.done), 0)::int as mistakes,
          coalesce(sum(p.time_ms) filter (where p.done and not p.failed), 0)::int as time_ms
        from days d
        join users u on u.id = d.user_id
        left join plays p on p.user_id = d.user_id and p.date = d.date
        where d.date = ${date} and (${country}::text is null or d.country = ${country})
        group by u.username, d.country`;
      return rows.map((r): BoardRow => ({
        username: String(r.username), country: String(r.country), played: r.played as number, solved: r.solved as number,
        hinted: r.hinted as number, mistakes: r.mistakes as number, timeMs: r.time_ms as number,
      }));
    },
    async history(id) {
      const rows = await sql`select *, date::text as day, extract(epoch from started_at) * 1000 as started from plays where user_id = ${id} order by date, level`;
      return rows.map((r) => ({ date: String(r.day), level: Number(r.level), row: { ...state(r), timeMs: Number(r.time_ms) } as LevelRow }));
    },
  };
}
