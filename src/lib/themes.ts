type Idea = { key: string; label: string; explain: string };

// Lichess puzzle themes, most telling first. A puzzle's idea is the first theme it carries.
// Each has a plain explanation for players who don't know the chess term.
export const IDEAS: Idea[] = [
  { key: 'mateIn1', label: 'Mate in 1', explain: 'Checkmate the king in one move.' },
  { key: 'mateIn2', label: 'Mate in 2', explain: 'Checkmate the king in two moves, whatever the other side plays.' },
  { key: 'mateIn3', label: 'Mate in 3', explain: 'Checkmate the king in three moves, whatever the other side plays.' },
  { key: 'mate', label: 'Checkmate', explain: 'Trap the king so it has no escape. That wins the game.' },
  { key: 'promotion', label: 'Promote a pawn', explain: 'Get a pawn to the last row, where it turns into a queen or another piece.' },
  { key: 'fork', label: 'Fork', explain: 'Attack two pieces with one piece at the same time. They can save only one.' },
  { key: 'pin', label: 'Pin', explain: 'Attack a piece that can’t move away, because a more valuable piece stands behind it.' },
  { key: 'skewer', label: 'Skewer', explain: 'Attack a valuable piece. When it moves away, take the piece behind it.' },
  { key: 'discoveredAttack', label: 'Discovered attack', explain: 'Move one piece out of the way, so the piece behind it attacks.' },
  { key: 'discoveredCheck', label: 'Discovered check', explain: 'Move one piece out of the way, so the piece behind it gives check.' },
  { key: 'doubleCheck', label: 'Double check', explain: 'Give check with two pieces at once. The king has to move.' },
  { key: 'trappedPiece', label: 'Trap a piece', explain: 'Attack a piece that has no safe square to run to.' },
  { key: 'hangingPiece', label: 'Hanging piece', explain: 'A piece has no protection. Take it for free.' },
  { key: 'capturingDefender', label: 'Remove the defender', explain: 'Take the piece that guards something. Then take what it guarded.' },
  { key: 'deflection', label: 'Deflection', explain: 'Force a defending piece away from the job it is doing.' },
  { key: 'attraction', label: 'Attraction', explain: 'Lure a piece, often the king, onto a bad square, usually by giving something up.' },
  { key: 'interference', label: 'Interference', explain: 'Put a piece in the way, between an enemy piece and what it defends.' },
  { key: 'intermezzo', label: 'In-between move', explain: 'Before the move everyone expects, play a stronger one first, such as a check.' },
  { key: 'clearance', label: 'Clearance', explain: 'Move your own piece out of the way to open a line or a square for another piece.' },
  { key: 'xRayAttack', label: 'X-ray attack', explain: 'A piece attacks or defends a square through another piece on the same line.' },
  { key: 'sacrifice', label: 'Sacrifice', explain: 'Give up a piece on purpose to win something bigger.' },
  { key: 'zugzwang', label: 'Zugzwang', explain: 'The other side must move, and every move they have makes things worse.' },
  { key: 'quietMove', label: 'Quiet move', explain: 'A calm move, with no check or capture, that sets up a strong threat.' },
  { key: 'defensiveMove', label: 'Defensive move', explain: 'Find the move that stops the other side’s threat.' },
  { key: 'exposedKing', label: 'Exposed king', explain: 'The enemy king has few defenders around it. Go after it.' },
  { key: 'kingsideAttack', label: 'Kingside attack', explain: 'Attack the king on the kingside, the half of the board where the kings start.' },
  { key: 'queensideAttack', label: 'Queenside attack', explain: 'Attack on the queenside, the half of the board where the queens start.' },
  { key: 'advancedPawn', label: 'Advanced pawn', explain: 'A pawn is close to the last row. Push it or use it.' },
  { key: 'equality', label: 'Save the game', explain: 'You are behind. Find the move that gets you back level.' },
  { key: 'crushing', label: 'Win decisively', explain: 'Find the move that wins a lot, often the game.' },
  { key: 'advantage', label: 'Win material', explain: 'Find the move that wins a piece or some pawns.' },
];

const FALLBACK: Idea = { key: '', label: 'Find the best move', explain: 'Look for the strongest move. Try checks, captures and threats first.' };

function idea(themes: string): Idea {
  const set = new Set(themes.split(' '));
  return IDEAS.find((i) => set.has(i.key)) ?? FALLBACK;
}

export const themeLabel = (themes: string) => idea(themes).label;
export const themeExplain = (themes: string) => idea(themes).explain;
