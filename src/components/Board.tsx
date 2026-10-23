import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Color, PuzzleRun, Sq } from '../lib/puzzle';
import { Piece } from './pieces';

const FILES = 'abcdefgh';
const NAMES: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

type Props = {
  run: PuzzleRun;
  version: number;
  orientation: Color;
  coords: boolean;
  hintSq: Sq | null;
  hintTo: Sq | null;
  shake: { sq: Sq; n: number } | null;
  interactive: boolean;
  onMove: (from: Sq, to: Sq) => void;
};

type Placed = { id: number; sq: Sq; code: string };

/** Display (col,row) for a square, given which side sits at the bottom. */
function pos(sq: Sq, o: Color) {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]) - 1;
  return o === 'w' ? { col: f, row: 7 - r } : { col: 7 - f, row: r };
}
function sqAt(col: number, row: number, o: Color): Sq {
  return o === 'w' ? FILES[col] + (8 - row) : FILES[7 - col] + (row + 1);
}

export function Board({ run, version, orientation: o, coords, hintSq, hintTo, shake, interactive, onMove }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Sq | null>(null);
  const [focusSq, setFocusSq] = useState<Sq>(o === 'w' ? 'e2' : 'e7');
  const drag = useRef<{ from: Sq; el: HTMLElement; x0: number; y0: number; moved: boolean; reselect: boolean } | null>(null);
  const dropped = useRef<Sq | null>(null);

  // Stable piece identities so a moved piece is the same element and slides via CSS.
  const ids = useRef<{ map: Map<Sq, number>; next: number; key: string }>({ map: new Map(), next: 1, key: '' });
  const grid = run.board();
  const placed: Placed[] = [];
  {
    const st = ids.current;
    const lm = run.lastMove;
    const key = lm ? `${version}:${lm.from}${lm.to}` : `${version}`;
    if (st.key !== key) {
      for (const m of lm ? [lm, lm.rook] : []) {
        if (!m || !st.map.has(m.from)) continue;
        const id = st.map.get(m.from)!;
        st.map.delete(m.from);
        st.map.set(m.to, id);
      }
      st.key = key;
    }
    const live = new Map<Sq, number>();
    grid.forEach((rank, ri) =>
      rank.forEach((p, fi) => {
        if (!p) return;
        const sq = FILES[fi] + (8 - ri);
        const id = st.map.get(sq) ?? st.next++;
        live.set(sq, id);
        placed.push({ id, sq, code: p.color + p.type.toUpperCase() });
      }),
    );
    st.map = live;
  }
  placed.sort((a, b) => a.id - b.id);

  const targets = selected ? run.targets(selected) : [];
  const pieceAt = (sq: Sq) => grid[8 - Number(sq[1])][FILES.indexOf(sq[0])];
  const ownPiece = (sq: Sq) => interactive && pieceAt(sq)?.color === run.player;
  const checkSq = run.inCheck()
    ? placed.find((p) => p.code === run.turn() + 'K')?.sq
    : undefined;

  useEffect(() => setSelected(null), [version, interactive]);

  // Drop: the piece is already under the pointer, so skip the slide for that one render.
  useLayoutEffect(() => {
    dropped.current = null;
  });

  function squareFromPoint(x: number, y: number): Sq | null {
    const r = boardRef.current!.getBoundingClientRect();
    const col = Math.floor(((x - r.left) / r.width) * 8);
    const row = Math.floor(((y - r.top) / r.height) * 8);
    return col < 0 || col > 7 || row < 0 || row > 7 ? null : sqAt(col, row, o);
  }

  function tryTo(from: Sq, to: Sq, viaDrag = false) {
    setSelected(null);
    if (run.targets(from).includes(to)) {
      if (viaDrag) dropped.current = to;
      onMove(from, to);
    }
  }

  function activate(sq: Sq) {
    if (!interactive) return;
    if (selected && targets.includes(sq)) return tryTo(selected, sq);
    if (ownPiece(sq)) return setSelected(sq === selected ? null : sq);
    setSelected(null);
  }

  function onPointerDown(e: PointerEvent) {
    if (!interactive || e.button > 0) return;
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (!sq) return;
    setFocusSq(sq);
    if (selected && targets.includes(sq)) return tryTo(selected, sq);
    if (!ownPiece(sq)) return setSelected(null);
    const el = boardRef.current!.querySelector<HTMLElement>(`[data-sq="${sq}"]`);
    if (!el) return;
    drag.current = { from: sq, el, x0: e.clientX, y0: e.clientY, moved: false, reselect: sq === selected };
    setSelected(sq);
    boardRef.current!.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    d.el.classList.add('dragging');
    d.el.style.translate = `${dx}px ${dy}px`;
  }

  function onPointerUp(e: PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    d.el.classList.remove('dragging');
    d.el.style.translate = '';
    if (d.moved) {
      const to = squareFromPoint(e.clientX, e.clientY);
      if (to && to !== d.from) tryTo(d.from, to, true);
    } else if (d.reselect) {
      setSelected(null);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const { col, row } = pos(focusSq, o);
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (step[e.key]) {
      e.preventDefault();
      const c = Math.min(7, Math.max(0, col + step[e.key][0]));
      const r = Math.min(7, Math.max(0, row + step[e.key][1]));
      const next = sqAt(c, r, o);
      setFocusSq(next);
      boardRef.current!.querySelector<HTMLElement>(`[data-square="${next}"]`)?.focus();
    } else if (e.key === 'Escape') {
      setSelected(null);
    }
  }

  const lm = run.lastMove;
  const slow = lm && lm.by !== run.player;

  return (
    <div
      ref={boardRef}
      className={`board${interactive ? '' : ' locked'}`}
      role="grid"
      aria-label={`Chess board, you play ${run.player === 'w' ? 'white' : 'black'}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: 64 }, (_, i) => {
        const col = i % 8;
        const row = Math.floor(i / 8);
        const sq = sqAt(col, row, o);
        const p = pieceAt(sq);
        const dark = (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1;
        const cls = [
          'sq',
          dark ? 'dark' : 'light',
          lm && (sq === lm.from || sq === lm.to) && 'last',
          sq === selected && 'sel',
          targets.includes(sq) && (p ? 'capture' : 'target'),
          sq === hintSq && 'hint',
          sq === hintTo && 'hint-to',
          sq === checkSq && 'check',
        ].filter(Boolean).join(' ');
        const label = `${sq}${p ? `, ${p.color === 'w' ? 'white' : 'black'} ${NAMES[p.type]}` : ''}`;
        return (
          <button
            key={sq}
            type="button"
            className={cls}
            data-square={sq}
            tabIndex={sq === focusSq ? 0 : -1}
            aria-label={label}
            aria-pressed={sq === selected || undefined}
            onClick={(e) => e.detail === 0 && activate(sq)}
            onFocus={() => setFocusSq(sq)}
          >
            {coords && col === 0 && <span className="rank">{sq[1]}</span>}
            {coords && row === 7 && <span className="file">{sq[0]}</span>}
          </button>
        );
      })}
      <div className="pieces" aria-hidden="true">
        {placed.map(({ id, sq, code }) => {
          const { col, row } = pos(sq, o);
          const moving = lm?.to === sq;
          const cls = [
            'piece',
            moving && slow && 'slow',
            dropped.current === sq && 'instant',
            shake?.sq === sq && `shake shake-${shake.n % 2}`,
          ].filter(Boolean).join(' ');
          return (
            <div key={id} data-sq={sq} className={cls} style={{ transform: `translate(${col * 100}%, ${row * 100}%)` }}>
              <Piece code={code} />
            </div>
          );
        })}
      </div>
      {hintSq && hintTo && <HintArrow from={pos(hintSq, o)} to={pos(hintTo, o)} />}
    </div>
  );
}

/** Path hint: an arrow from the piece's square to its destination, in board units (0–8). */
function HintArrow({ from, to }: { from: { col: number; row: number }; to: { col: number; row: number } }) {
  const x1 = from.col + 0.5;
  const y1 = from.row + 0.5;
  const x2 = to.col + 0.5;
  const y2 = to.row + 0.5;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const head = 0.42;
  const bx = x2 - ux * head; // base of the arrowhead
  const by = y2 - uy * head;
  const w = 0.24;
  return (
    <svg className="hint-arrow" viewBox="0 0 8 8" aria-hidden="true">
      <line x1={x1 + ux * 0.25} y1={y1 + uy * 0.25} x2={bx} y2={by} strokeWidth={0.17} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${bx - uy * w},${by + ux * w} ${bx + uy * w},${by - ux * w}`} />
    </svg>
  );
}
