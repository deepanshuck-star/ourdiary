// Hearts & Kisses: tic-tac-toe between the two partners. Pure logic, no
// imports, so `node --test` can load it — see tests/hearts-kisses.test.mjs.
//
// It used to keep its board in localStorage, which made it a one-phone game:
// either person could place both hearts and kisses, and nothing reached the
// other phone. The board now lives in a shared game session (see
// hooks/useGameSession), and these functions are the rules both phones agree
// on — whose turn it is, who may place what, and what a finished round means.

export type HKCell = string | null;

export const HK_WIN_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export interface HeartsKissesState {
  /** Nine cells, row-major; each holds the id of the player who marked it. */
  board: HKCell[];
  /**
   * Fixed for the whole match. players[0] always plays hearts 💖 and
   * players[1] kisses 💋, so a person keeps their mark from round to round.
   */
  players: [string, string];
  /** Whose move it is. Null once the round is over. */
  turn: string | null;
  /** Who opened this round. Alternates, so neither always gets the edge. */
  starter: string;
  winner: string | null;
  winningLine: number[] | null;
  draw: boolean;
  moves: number;
  round: number;
  /** Wins per player id, plus draws. */
  score: Record<string, number> & { draws: number };
  stake: string;
}

function emptyScore(players: [string, string]): HeartsKissesState['score'] {
  return { [players[0]]: 0, [players[1]]: 0, draws: 0 } as HeartsKissesState['score'];
}

export function createHeartsKisses(
  players: [string, string],
  starter: string,
  stake: string
): HeartsKissesState {
  const first = players.includes(starter) ? starter : players[0];
  return {
    board: new Array(9).fill(null),
    players,
    turn: first,
    starter: first,
    winner: null,
    winningLine: null,
    draw: false,
    moves: 0,
    round: 1,
    score: emptyScore(players),
    stake,
  };
}

export function otherHKPlayer(state: HeartsKissesState, player: string): string {
  return state.players[0] === player ? state.players[1] : state.players[0];
}

export function markFor(state: HeartsKissesState, player: string | null): '💖' | '💋' | '' {
  if (!player) return '';
  if (player === state.players[0]) return '💖';
  if (player === state.players[1]) return '💋';
  return '';
}

export function isRoundOver(state: HeartsKissesState): boolean {
  return Boolean(state.winner) || state.draw;
}

export function findHKWin(board: HKCell[]): { winner: string; line: number[] } | null {
  for (const [a, b, c] of HK_WIN_LINES) {
    const owner = board[a];
    if (owner && owner === board[b] && owner === board[c]) {
      return { winner: owner, line: [a, b, c] };
    }
  }
  return null;
}

/**
 * Places `player`'s mark in `index`. Returns the new state, or null when the
 * move is not allowed: not this player's turn, not a player in this match,
 * a taken cell, or a round that is already over. The caller can treat null
 * as "ignore the tap" — no throwing in a click handler.
 */
export function placeMark(state: HeartsKissesState, index: number, player: string): HeartsKissesState | null {
  if (!state.players.includes(player)) return null;
  if (isRoundOver(state)) return null;
  if (state.turn !== player) return null;
  if (!Number.isInteger(index) || index < 0 || index > 8) return null;
  if (state.board[index] !== null) return null;

  const board = [...state.board];
  board[index] = player;
  const moves = state.moves + 1;
  const win = findHKWin(board);
  const draw = !win && moves === 9;

  const score = { ...state.score };
  if (win) score[win.winner] = (score[win.winner] ?? 0) + 1;
  else if (draw) score.draws += 1;

  return {
    ...state,
    board,
    moves,
    winner: win ? win.winner : null,
    winningLine: win ? win.line : null,
    draw,
    score,
    turn: win || draw ? null : otherHKPlayer(state, player),
  };
}

/** A fresh board for the next round. The other person opens it. */
export function nextRound(state: HeartsKissesState): HeartsKissesState {
  const starter = otherHKPlayer(state, state.starter);
  return {
    ...state,
    board: new Array(9).fill(null),
    turn: starter,
    starter,
    winner: null,
    winningLine: null,
    draw: false,
    moves: 0,
    round: state.round + 1,
  };
}

/**
 * The stake is what the round is played for, so it can only change before
 * anyone has moved or once the round is decided — never mid-round, when
 * whoever is losing would have a reason to change it.
 */
export function canChangeStake(state: HeartsKissesState): boolean {
  return state.moves === 0 || isRoundOver(state);
}

export function setStake(state: HeartsKissesState, stake: string): HeartsKissesState | null {
  const trimmed = stake.trim();
  if (!trimmed || !canChangeStake(state)) return null;
  return { ...state, stake: trimmed.slice(0, 200) };
}

export function resetScore(state: HeartsKissesState): HeartsKissesState {
  return { ...nextRound(state), score: emptyScore(state.players), round: 1 };
}
