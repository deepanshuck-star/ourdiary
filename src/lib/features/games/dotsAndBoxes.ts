// Dots and Boxes. Pure logic — see tests/dots-and-boxes.test.mjs.
//
// Simple rules, real tactics: claiming a box earns another turn, which is
// what makes the endgame interesting rather than just filling in lines.

export interface DotsState {
  /** Boxes across and down; dots are size+1 in each direction. */
  size: number;
  /** Horizontal lines: (size+1) rows x size columns. */
  horizontal: boolean[];
  /** Vertical lines: size rows x (size+1) columns. */
  vertical: boolean[];
  /** Owner per box, row-major, or null while unclaimed. */
  boxes: (string | null)[];
  players: [string, string];
  /** True when the last move claimed a box, so the same player goes again. */
  claimedLast: boolean;
}

export type LineKind = 'h' | 'v';

export function createDots(players: [string, string], size = 4): DotsState {
  return {
    size,
    horizontal: new Array((size + 1) * size).fill(false),
    vertical: new Array(size * (size + 1)).fill(false),
    boxes: new Array(size * size).fill(null),
    players,
    claimedLast: false,
  };
}

export function hIndex(state: DotsState, row: number, col: number): number {
  return row * state.size + col;
}
export function vIndex(state: DotsState, row: number, col: number): number {
  return row * (state.size + 1) + col;
}

function inHRange(state: DotsState, row: number, col: number): boolean {
  return row >= 0 && row <= state.size && col >= 0 && col < state.size;
}
function inVRange(state: DotsState, row: number, col: number): boolean {
  return row >= 0 && row < state.size && col >= 0 && col <= state.size;
}

export function isLineDrawn(state: DotsState, kind: LineKind, row: number, col: number): boolean {
  if (kind === 'h') return inHRange(state, row, col) && state.horizontal[hIndex(state, row, col)];
  return inVRange(state, row, col) && state.vertical[vIndex(state, row, col)];
}

/** All four sides of a box are drawn. */
export function isBoxComplete(state: DotsState, row: number, col: number): boolean {
  return (
    isLineDrawn(state, 'h', row, col) &&
    isLineDrawn(state, 'h', row + 1, col) &&
    isLineDrawn(state, 'v', row, col) &&
    isLineDrawn(state, 'v', row, col + 1)
  );
}

export interface DotsMoveResult {
  state: DotsState;
  /** How many boxes this move closed — 0, 1 or 2. */
  claimed: number;
  /** Who moves next. Claiming a box means the same player again. */
  nextPlayer: string;
}

/**
 * Draws a line. Returns null for an illegal move — out of range, already
 * drawn, a finished board, or a player who isn't in this game.
 *
 * A single line can close two boxes at once (the two either side of it), and
 * both are claimed. Missing that is the classic bug in this game.
 */
export function drawLine(
  state: DotsState,
  kind: LineKind,
  row: number,
  col: number,
  player: string
): DotsMoveResult | null {
  if (!state.players.includes(player)) return null;
  if (isComplete(state)) return null;
  if (kind === 'h' && !inHRange(state, row, col)) return null;
  if (kind === 'v' && !inVRange(state, row, col)) return null;
  if (isLineDrawn(state, kind, row, col)) return null;

  const next: DotsState = {
    ...state,
    horizontal: [...state.horizontal],
    vertical: [...state.vertical],
    boxes: [...state.boxes],
  };
  if (kind === 'h') next.horizontal[hIndex(state, row, col)] = true;
  else next.vertical[vIndex(state, row, col)] = true;

  // Only the boxes touching this line can have been closed by it.
  const candidates: [number, number][] =
    kind === 'h'
      ? [
          [row - 1, col],
          [row, col],
        ]
      : [
          [row, col - 1],
          [row, col],
        ];

  let claimed = 0;
  for (const [r, c] of candidates) {
    if (r < 0 || r >= state.size || c < 0 || c >= state.size) continue;
    if (next.boxes[r * state.size + c] !== null) continue;
    if (isBoxComplete(next, r, c)) {
      next.boxes[r * state.size + c] = player;
      claimed++;
    }
  }

  next.claimedLast = claimed > 0;
  return {
    state: next,
    claimed,
    nextPlayer: claimed > 0 ? player : otherDotsPlayer(state, player),
  };
}

export function otherDotsPlayer(state: DotsState, player: string): string {
  return state.players[0] === player ? state.players[1] : state.players[0];
}

export function scores(state: DotsState): Record<string, number> {
  const tally: Record<string, number> = { [state.players[0]]: 0, [state.players[1]]: 0 };
  for (const owner of state.boxes) {
    if (owner && owner in tally) tally[owner]++;
  }
  return tally;
}

export function isComplete(state: DotsState): boolean {
  return state.boxes.every((b) => b !== null);
}

/** Winner id, 'draw', or null while the board is unfinished. */
export function dotsWinner(state: DotsState): string | 'draw' | null {
  if (!isComplete(state)) return null;
  const tally = scores(state);
  const [a, b] = state.players;
  if (tally[a] === tally[b]) return 'draw';
  return tally[a] > tally[b] ? a : b;
}
