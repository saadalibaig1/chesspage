import { Chess, type Move } from 'chess.js';
import type { Puzzle } from './daily';

export type Sq = string;
export type Color = 'w' | 'b';
export type LastMove = { from: Sq; to: Sq; san: string; by: Color; captured: boolean; rook?: { from: Sq; to: Sq } };
export type TryResult = 'correct' | 'solved' | 'wrong' | 'repeat' | 'illegal';

const uci = (m: Pick<Move, 'from' | 'to' | 'promotion'>) => m.from + m.to + (m.promotion ?? '');

export class PuzzleRun {
  readonly player: Color;
  readonly totalSteps: number;
  lastMove: LastMove | null = null;
  status: 'playing' | 'solved' | 'revealed' = 'playing';
  step = 0;
  private chess: Chess;
  private cursor = 0; // index into solution of the next move to play
  private wrong = new Set<string>(); // "fen|uci" of wrong moves already tried

  constructor(private puzzle: Puzzle, autoOpen = true) {
    this.chess = new Chess(puzzle.fen);
    this.player = this.chess.turn() === 'w' ? 'b' : 'w';
    this.totalSteps = Math.ceil((puzzle.moves.length - 1) / 2);
    if (autoOpen) this.open();
  }

  /** The solution after the setup move, in notation, e.g. ["Qd5+", "Kh8", "Qxc6"]. */
  solution(): string[] {
    const c = new Chess(this.puzzle.fen);
    return this.puzzle.moves.map((u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san).slice(1);
  }

  /** Rewinds to the position after the setup move, so a revealed solution can be replayed. */
  restart() {
    this.chess = new Chess(this.puzzle.fen);
    this.cursor = 0;
    this.step = 0;
    this.open();
  }

  /** Plays the opponent's setup move (solution[0]). */
  open(): LastMove | null {
    if (this.cursor !== 0) return null;
    return this.play(this.puzzle.moves[this.cursor++]);
  }

  fen() { return this.chess.fen(); }
  board() { return this.chess.board(); }
  turn(): Color { return this.chess.turn(); }
  inCheck() { return this.chess.inCheck(); }

  targets(from: Sq): Sq[] {
    if (this.status !== 'playing' || this.chess.turn() !== this.player) return [];
    return [...new Set(this.chess.moves({ square: from as never, verbose: true }).map((m) => m.to))];
  }

  needsPromotion(from: Sq, to: Sq): boolean {
    return this.chess.moves({ square: from as never, verbose: true }).some((m) => m.to === to && !!m.promotion);
  }

  private expected(): string | undefined { return this.puzzle.moves[this.cursor]; }

  private play(u: string): LastMove {
    const by = this.chess.turn();
    const m = this.chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    const castle = m.flags.includes('k') ? ['h', 'f'] : m.flags.includes('q') ? ['a', 'd'] : null;
    const rank = m.from[1];
    this.lastMove = {
      from: m.from, to: m.to, san: m.san, by, captured: !!m.captured,
      ...(castle && { rook: { from: castle[0] + rank, to: castle[1] + rank } }),
    };
    return this.lastMove;
  }

  tryMove(from: Sq, to: Sq): TryResult {
    if (this.status !== 'playing' || this.chess.turn() !== this.player || this.cursor === 0) return 'illegal';
    const exp = this.expected()!;
    const promo = this.needsPromotion(from, to) ? (exp.slice(0, 4) === from + to && exp[4]) || 'q' : undefined;
    const legal = this.chess.moves({ square: from as never, verbose: true }).find((m) => m.to === to && (!promo || m.promotion === promo));
    if (!legal) return 'illegal';
    const last = this.cursor >= this.puzzle.moves.length - 1;
    const matches = uci(legal) === exp;
    if (!matches) {
      // Lichess rule: any mate on the final move also solves it
      const probe = new Chess(this.chess.fen());
      probe.move({ from, to, promotion: promo });
      if (!(last && probe.isCheckmate())) {
        const key = `${this.chess.fen()}|${uci(legal)}`;
        if (this.wrong.has(key)) return 'repeat';
        this.wrong.add(key);
        return 'wrong';
      }
    }
    this.play(from + to + (promo ?? ''));
    this.cursor++;
    this.step++;
    if (last) {
      this.status = 'solved';
      return 'solved';
    }
    return 'correct';
  }

  /** Wrong moves tried so far, to persist across a reload. */
  tried(): string[] { return [...this.wrong]; }
  restoreTried(list: string[]) { list.forEach((k) => this.wrong.add(k)); }

  reply(): LastMove | null {
    if (this.chess.turn() === this.player || this.cursor >= this.puzzle.moves.length) return null;
    return this.play(this.puzzle.moves[this.cursor++]);
  }

  hint(): Sq { return this.expected()?.slice(0, 2) ?? ''; }
  hintTo(): Sq { return this.expected()?.slice(2, 4) ?? ''; }

  /** Gives up on the puzzle and plays the next solution move (null when finished). */
  revealNext(): LastMove | null {
    this.open();
    this.status = 'revealed';
    if (this.cursor >= this.puzzle.moves.length) return null;
    if (this.chess.turn() === this.player) this.step++;
    return this.play(this.puzzle.moves[this.cursor++]);
  }

  reveal(): LastMove[] {
    const played: LastMove[] = [];
    for (let m = this.revealNext(); m; m = this.revealNext()) played.push(m);
    return played;
  }
}
