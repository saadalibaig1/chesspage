import { api } from './api';
import type { TryResult } from './puzzle';

/** The server's view of a level after open. */
export type LevelView = { moves: string[]; mistakes: number; left: number; hinted: boolean; done: boolean; failed: boolean; timeMs: number };
type Played = Extract<TryResult, 'correct' | 'wrong' | 'solved'>;
type MoveReply = { result: TryResult | 'failed' | 'timeout' };

/** The server says 'failed' where the game says 'wrong' for the last try. */
const same = (local: Played, server: MoveReply['result']) => (server === 'failed' ? 'wrong' : server) === local;

/**
 * Sends a signed-in player's Daily to the server, in order, while the game plays on locally.
 * The server checks each move with the same rules. If a request fails or the server's answer differs,
 * that level stops counting for the leaderboard until it is opened again (open restarts it on both sides).
 */
export class RankedDay {
  private chain: Promise<unknown> = Promise.resolve();
  private lost = new Set<number>();

  constructor(private date: string, private onLost: (level: number) => void) {}

  private lose(level: number) {
    if (this.lost.has(level)) return;
    this.lost.add(level);
    this.onLost(level);
  }

  private send<T>(level: number, body: Record<string, unknown>, check?: (r: T) => boolean): Promise<T | null> {
    const p = this.chain.then(async () => {
      if (this.lost.has(level)) return null;
      try {
        const r = await api<T>('/play', { ...body, date: this.date, level });
        if (check && !check(r)) this.lose(level);
        return r;
      } catch {
        this.lose(level);
        return null;
      }
    });
    this.chain = p;
    return p;
  }

  open(level: number): Promise<LevelView | null> {
    this.lost.delete(level);
    return this.send<LevelView>(level, { action: 'open' });
  }

  move(level: number, from: string, to: string, local: Played) {
    void this.send<MoveReply>(level, { action: 'move', from, to }, (r) => same(local, r.result));
  }

  hint(level: number) {
    void this.send(level, { action: 'hint' });
  }
}

/** The same for the Timer puzzle: the server runs its own clock from start. */
export class RankedTimer {
  private chain: Promise<unknown> = Promise.resolve();
  private lost = false;

  constructor(private date: string, private onLost: () => void) {}

  private send<T>(body: Record<string, unknown>, check?: (r: T) => boolean) {
    this.chain = this.chain.then(async () => {
      if (this.lost) return;
      try {
        const r = await api<T>('/timer', { ...body, date: this.date });
        if (check && !check(r)) throw new Error('mismatch');
      } catch {
        this.lost = true;
        this.onLost();
      }
    });
  }

  start() {
    this.send({ action: 'start' });
  }

  move(from: string, to: string, local: Played) {
    this.send<MoveReply>({ action: 'move', from, to }, (r) => same(local, r.result));
  }
}
