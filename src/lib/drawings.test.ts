import { arrowPath, paintFor, toggleDrawing, type Drawing } from './drawings';

const none = { ctrl: false, alt: false, shift: false };

describe('paintFor', () => {
  it('uses chess.com colours for arrows: yellow, Ctrl red, Alt blue, Shift green', () => {
    expect(paintFor('arrow', none)).toBe('yellow');
    expect(paintFor('arrow', { ...none, ctrl: true })).toBe('red');
    expect(paintFor('arrow', { ...none, alt: true })).toBe('blue');
    expect(paintFor('arrow', { ...none, shift: true })).toBe('green');
  });

  it('uses chess.com colours for squares: red, Ctrl yellow, Alt blue, Shift green', () => {
    expect(paintFor('square', none)).toBe('red');
    expect(paintFor('square', { ...none, ctrl: true })).toBe('yellow');
    expect(paintFor('square', { ...none, alt: true })).toBe('blue');
    expect(paintFor('square', { ...none, shift: true })).toBe('green');
  });
});

describe('toggleDrawing', () => {
  const a: Drawing = { from: 'e2', to: 'e4', color: 'yellow' };

  it('adds a new arrow or square', () => {
    expect(toggleDrawing([], a)).toEqual([a]);
  });

  it('removes the same drawing when drawn again', () => {
    expect(toggleDrawing([a], { ...a })).toEqual([]);
  });

  it('recolours a drawing drawn again in another colour', () => {
    expect(toggleDrawing([a], { ...a, color: 'red' })).toEqual([{ ...a, color: 'red' }]);
  });
});

describe('arrowPath', () => {
  it('goes straight for ordinary moves', () => {
    expect(arrowPath({ col: 4, row: 6 }, { col: 4, row: 4 })).toEqual([{ x: 4.5, y: 6.5 }, { x: 4.5, y: 4.5 }]);
  });

  it('bends like an L for knight moves, long leg first', () => {
    expect(arrowPath({ col: 6, row: 7 }, { col: 5, row: 5 })).toEqual([{ x: 6.5, y: 7.5 }, { x: 6.5, y: 5.5 }, { x: 5.5, y: 5.5 }]);
    expect(arrowPath({ col: 1, row: 7 }, { col: 3, row: 6 })).toEqual([{ x: 1.5, y: 7.5 }, { x: 3.5, y: 7.5 }, { x: 3.5, y: 6.5 }]);
  });
});
