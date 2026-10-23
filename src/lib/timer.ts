export type PauseReason = 'hidden' | 'modal';

/** Per-puzzle solve timer that only counts while started and not paused for any reason. */
export class PuzzleTimer {
  private acc = 0;
  private since: number | null = null;
  private running = false;
  private paused = new Set<PauseReason>();

  constructor(private now: () => number = () => performance.now()) {}

  private sync() {
    const active = this.running && this.paused.size === 0;
    if (active && this.since === null) this.since = this.now();
    if (!active && this.since !== null) {
      this.acc += this.now() - this.since;
      this.since = null;
    }
  }

  start() {
    this.running = true;
    this.sync();
  }

  stop(): number {
    this.running = false;
    this.sync();
    return this.acc;
  }

  reset() {
    this.acc = 0;
    this.since = null;
    this.running = false;
  }

  pause(reason: PauseReason, on: boolean) {
    if (on) this.paused.add(reason);
    else this.paused.delete(reason);
    this.sync();
  }

  elapsed(): number {
    return this.acc + (this.since === null ? 0 : this.now() - this.since);
  }
}
