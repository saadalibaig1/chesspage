// One-off: curate daily puzzles from the Lichess open puzzle database (CC0)
// and write src/data/puzzles.json. Reads the Hugging Face parquet mirror with
// HTTP range requests, so only the needed columns/rows are downloaded.
// Output: 5 bands (warm-up → hard), each [id, fen, uciMoves, rating, themes][].
import { writeFileSync } from 'node:fs';
import { asyncBufferFromUrl, parquetReadObjects } from 'hyparquet';

const BANDS = [[700, 1000], [1000, 1300], [1300, 1600], [1600, 1900], [1900, 2200]];
const PER_BAND = 365;
const CHUNK = 50_000;
const SRC = 'https://huggingface.co/api/datasets/Lichess/chess-puzzles/parquet/default/train/0.parquet';
const COLUMNS = ['PuzzleId', 'FEN', 'Moves', 'Rating', 'Popularity', 'NbPlays', 'Themes'];
// Lichess tags that describe length, phase or source rather than the tactical idea.
const NOISE = new Set(['opening', 'middlegame', 'endgame', 'short', 'long', 'veryLong', 'oneMove', 'master', 'masterVsMaster', 'superGM', 'mix', 'playerGames']);

const file = await asyncBufferFromUrl({ url: SRC });
const bands = BANDS.map(() => []);

for (let start = 0; bands.some((b) => b.length < PER_BAND); start += CHUNK) {
  const rows = await parquetReadObjects({ file, columns: COLUMNS, rowStart: start, rowEnd: start + CHUNK });
  if (!rows.length) throw new Error('ran out of rows');
  for (const row of rows) {
    const plies = row.Moves.split(' ').length;
    if (row.Popularity < 90 || row.NbPlays < 1000 || plies > 6 || plies % 2) continue;
    const b = BANDS.findIndex(([lo, hi]) => row.Rating >= lo && row.Rating < hi);
    if (b >= 0 && bands[b].length < PER_BAND) bands[b].push([row.PuzzleId, row.FEN, row.Moves, Number(row.Rating), [...row.Themes].filter((t) => !NOISE.has(t)).join(' ')]);
  }
  console.log(start + CHUNK, bands.map((b) => b.length).join(' '));
}

writeFileSync(new URL('../src/data/puzzles.json', import.meta.url), JSON.stringify(bands));
console.log('done');
