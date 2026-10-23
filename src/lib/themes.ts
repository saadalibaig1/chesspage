// Lichess puzzle themes, most telling first. A puzzle's label is the first theme it carries.
const LABELS: [string, string][] = [
  ['mateIn1', 'Mate in 1'],
  ['mateIn2', 'Mate in 2'],
  ['mateIn3', 'Mate in 3'],
  ['mate', 'Checkmate'],
  ['promotion', 'Promote a pawn'],
  ['fork', 'Fork'],
  ['pin', 'Pin'],
  ['skewer', 'Skewer'],
  ['discoveredAttack', 'Discovered attack'],
  ['discoveredCheck', 'Discovered check'],
  ['doubleCheck', 'Double check'],
  ['trappedPiece', 'Trap a piece'],
  ['hangingPiece', 'Hanging piece'],
  ['capturingDefender', 'Remove the defender'],
  ['deflection', 'Deflection'],
  ['attraction', 'Attraction'],
  ['interference', 'Interference'],
  ['intermezzo', 'In-between move'],
  ['clearance', 'Clearance'],
  ['xRayAttack', 'X-ray attack'],
  ['sacrifice', 'Sacrifice'],
  ['zugzwang', 'Zugzwang'],
  ['quietMove', 'Quiet move'],
  ['defensiveMove', 'Defensive move'],
  ['exposedKing', 'Exposed king'],
  ['kingsideAttack', 'Kingside attack'],
  ['queensideAttack', 'Queenside attack'],
  ['advancedPawn', 'Advanced pawn'],
  ['equality', 'Save the game'],
  ['crushing', 'Win decisively'],
  ['advantage', 'Win material'],
];

export function themeLabel(themes: string): string {
  const set = new Set(themes.split(' '));
  return LABELS.find(([key]) => set.has(key))?.[1] ?? 'Find the best move';
}
