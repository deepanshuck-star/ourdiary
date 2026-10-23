// Connect 4. Pure logic — see tests/connect4.test.mjs.
//
// Replaces tic-tac-toe as the "real" two-player game: noughts and crosses is
// solved, so every game between two people paying attention is a draw.

export const C4_COLS = 7;
export const C4_ROWS = 6;

/** A player is identified by the id the board was started with. */
export type C4Cell = string | null;

export interface Connect4State {
  /** Row-major, top row first: index = row * C4_COLS + col. */
  board: C4Cell[];
  players: [string, string];
  winner: string | null;
  /** The four cells that won, for highlighting. */
  winningLine: number[] | null;
  draw: boolean;
  moves: number;
}

export function createConnect4(players: [string, string]): Connect4State {
  return {
    board: new Array(C4_COLS * C4_ROWS).fill(null),
    players,
    winner: null,
    winningLine: null,
    draw: false,
    moves: 0,
  };
}

export function indexOf(row: number, col: number): number {
  return row * C4_COLS + col;
}

/** The row a disc dropped into `col` would land in, or -1 if the column is full. */
export function landingRow(board: C4Cell[], col: number): number {
  if (col < 0 || col >= C4_COLS) return -1;
  for (let row = C4_ROWS - 1; row >= 0; row--) {
    if (board[indexOf(row, col)] === null) return row;
  }
  return -1;
}

export function isColumnPlayable(state: Connect4State, col: number): boolean {
  if (state.winner || state.draw) return false;
  return landingRow(state.board, col) !== -1;
}

const DIRECTIONS: [number, number][] = [
  [0, 1], // →
  [1, 0], // ↓
  [1, 1], // ↘
  [1, -1], // ↙
];

/** The four-in-a-row through (row, col), or null. */
export function findWin(board: C4Cell[], row: number, col: number): number[] | null {
  const player = board[indexOf(row, col)];
  if (!player) return null;

  for (const [dr, dc] of DIRECTIONS) {
    const line = [indexOf(row, col)];
    // Walk both ways from the placed disc, so a win is found wherever in the
    // run the new disc sits — not only when it is an end.
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[indexOf(r, c)] === player) {
        line.push(indexOf(r, c));
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= 4) return line.sort((a, b) => a - b);
  }
  return null;
}

/**
 * Drops a disc for `player`. Returns a new state, or null when the move is
 * illegal — a full column, a finished game, or a player who isn't in it.
 * Returning null rather than throwing keeps the caller's click handler simple.
 */
export function dropDisc(state: Connect4State, col: number, player: string): Connect4State | null {
  if (!state.players.includes(player)) return null;
  if (!isColumnPlayable(state, col)) return null;

  const row = landingRow(state.board, col);
  const board = [...state.board];
  board[indexOf(row, col)] = player;

  const winningLine = findWin(board, row, col);
  const moves = state.moves + 1;

  return {
    ...state,
    board,
    moves,
    winner: winningLine ? player : null,
    winningLine,
    draw: !winningLine && moves === C4_COLS * C4_ROWS,
  };
}

export function otherPlayer(state: Connect4State, player: string): string {
  return state.players[0] === player ? state.players[1] : state.players[0];
}
