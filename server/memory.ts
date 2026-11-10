import type { BoardRow } from './rules.js';
import type { LevelRow, NewUser, Repo, TimerRow, User } from './service.js';

/** An in-memory Repo for tests. */
export function memoryRepo(): Repo {
  const users = new Map<string, User>();
  const levels = new Map<string, LevelRow>();
  const timers = new Map<string, TimerRow>();
  const days = new Map<string, string>();
  return {
    async findUser(uid) {
      return [...users.values()].find((u) => u.uid === uid) ?? null;
    },
    async addUser(u: NewUser) {
      const user = { ...u, id: String(users.size + 1), username: null };
      users.set(user.id, user);
      return user;
    },
    async setProfile(id, p) {
      const taken = p.username && [...users.values()].some((u) => u.id !== id && u.username?.toLowerCase() === p.username!.toLowerCase());
      if (taken) return 'taken';
      users.set(id, { ...users.get(id)!, ...p });
      return 'ok';
    },
    async level(id, date, level) {
      return levels.get(`${id}|${date}|${level}`) ?? null;
    },
    async saveLevel(id, date, level, row) {
      levels.set(`${id}|${date}|${level}`, row);
    },
    async lockDay(id, date, country) {
      if (!days.has(`${id}|${date}`)) days.set(`${id}|${date}`, country);
    },
    async timer(id, date) {
      return timers.get(`${id}|${date}`) ?? null;
    },
    async saveTimer(id, date, row) {
      timers.set(`${id}|${date}`, row);
    },
    async boardRows(date, country) {
      const out: BoardRow[] = [];
      for (const [key, c] of days) {
        const [id, d] = key.split('|');
        if (d !== date || (country && c !== country)) continue;
        const mine = [...levels].filter(([k]) => k.startsWith(`${id}|${date}|`)).map(([, r]) => r).filter((r) => r.done);
        const won = mine.filter((r) => !r.failed);
        out.push({
          username: users.get(id)!.username!,
          country: c,
          played: mine.length,
          solved: won.length,
          hinted: won.filter((r) => r.hinted).length,
          mistakes: mine.reduce((t, r) => t + r.mistakes, 0),
          timeMs: won.reduce((t, r) => t + r.timeMs, 0),
        });
      }
      return out;
    },
    async history(id) {
      return [...levels].filter(([k]) => k.startsWith(`${id}|`)).map(([k, row]) => {
        const [, date, level] = k.split('|');
        return { date, level: Number(level), row };
      });
    },
  };
}
