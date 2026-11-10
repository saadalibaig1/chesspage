import type { Sq } from './puzzle';

// Right-click arrows and squares, as on chess.com. Desktop only: phones have no right-click.

export type Paint = 'yellow' | 'red' | 'blue' | 'green';
/** An arrow, or a painted square when from === to. */
export type Drawing = { from: Sq; to: Sq; color: Paint };
export type Keys = { ctrl: boolean; alt: boolean; shift: boolean };

/** Chess.com's colours: arrows are yellow and squares red by default; Ctrl swaps the two, Alt is blue, Shift is green. */
export function paintFor(kind: 'arrow' | 'square', k: Keys): Paint {
  if (k.shift) return 'green';
  if (k.alt) return 'blue';
  const plain = kind === 'arrow' ? 'yellow' : 'red';
  return k.ctrl ? (plain === 'yellow' ? 'red' : 'yellow') : plain;
}

/** Drawing the same thing again removes it; in another colour, recolours it. */
export function toggleDrawing(list: Drawing[], d: Drawing): Drawing[] {
  const i = list.findIndex((x) => x.from === d.from && x.to === d.to);
  if (i < 0) return [...list, d];
  if (list[i].color === d.color) return list.filter((_, j) => j !== i);
  return list.map((x, j) => (j === i ? d : x));
}

type Cell = { col: number; row: number };

/** Points from square centre to square centre, in board units (0–8). Knight moves bend like an L, long leg first. */
export function arrowPath(from: Cell, to: Cell): { x: number; y: number }[] {
  const a = { x: from.col + 0.5, y: from.row + 0.5 };
  const b = { x: to.col + 0.5, y: to.row + 0.5 };
  const dc = Math.abs(to.col - from.col);
  const dr = Math.abs(to.row - from.row);
  if (dc * dr !== 2) return [a, b];
  return [a, dr > dc ? { x: a.x, y: b.y } : { x: b.x, y: a.y }, b];
}
