// Collaborative games — you're building something together rather than
// beating each other. Pure logic; see tests/collab-games.test.mjs.

// --------------------------------------------------------------- Story Tennis ---

export const MAX_SENTENCE = 240;

export interface StorySentence {
  text: string;
  playerId: string;
  at: string; // ISO
}

export interface StoryState {
  title: string;
  sentences: StorySentence[];
  players: [string, string];
  finished: boolean;
}

export const STORY_OPENERS = [
  'The day we accidentally boarded the wrong train…',
  'Nobody expected the cat to be holding the map.',
  'It started with a text message sent to the wrong person.',
  'Years from now, someone will find the box we buried.',
  'The last thing we agreed on was the pizza.',
  'There is a version of us living in a lighthouse.',
];

export function createStory(players: [string, string], title = ''): StoryState {
  return { title: title.trim(), sentences: [], players, finished: false };
}

/** Returns an error message, or null when the sentence may be added. */
export function validateSentence(raw: string): string | null {
  const text = raw.trim();
  if (!text) return 'Add a sentence first.';
  if (text.length > MAX_SENTENCE) return `Keep it under ${MAX_SENTENCE} characters.`;
  return null;
}

export function addSentence(
  state: StoryState,
  raw: string,
  playerId: string,
  at: Date = new Date()
): StoryState | null {
  if (state.finished) return null;
  if (!state.players.includes(playerId)) return null;
  if (validateSentence(raw) !== null) return null;
  return {
    ...state,
    sentences: [...state.sentences, { text: raw.trim(), playerId, at: at.toISOString() }],
  };
}

export function otherStoryPlayer(state: StoryState, playerId: string): string {
  return state.players[0] === playerId ? state.players[1] : state.players[0];
}

/** The finished story as one paragraph, for reading back or saving. */
export function storyText(state: StoryState): string {
  return state.sentences.map((s) => s.text).join(' ');
}

export function storyWordCount(state: StoryState): number {
  const text = storyText(state).trim();
  return text === '' ? 0 : text.split(/\s+/).length;
}

// ----------------------------------------------------------- Relationship Bingo ---
//
// Not a sitting-down game: a card of things to do together, ticked off over
// months. The win condition is deliberately generous — a line, not the whole
// card — so it's reachable.

export const BINGO_SIZE = 5;

export interface BingoSquare {
  id: string;
  text: string;
  done: boolean;
  doneOn?: string; // YYYY-MM-DD
  /** A memory can be attached as proof. */
  memoryId?: string;
}

export interface BingoState {
  squares: BingoSquare[]; // BINGO_SIZE * BINGO_SIZE, row-major
  createdOn: string;
}

export const BINGO_IDEAS = [
  'Watch the sunrise together',
  'Cook something neither of us has made',
  'Take a photo in a photobooth',
  'Spend a whole day without phones',
  'Try a restaurant with no reviews',
  'Go somewhere neither of us has been',
  'Learn each other’s favourite song on purpose',
  'Write each other a letter by hand',
  'Dance in the kitchen',
  'Lose an argument gracefully',
  'Plant something and keep it alive',
  'Do a jigsaw to the end',
  'Stay up talking past 2am',
  'Go for a walk with no destination',
  'Cook from one of our mothers’ recipes',
  'Rewatch the first film we saw together',
  'Make a playlist for each other',
  'Visit the place we first met',
  'Spend an afternoon in a bookshop',
  'Take a train with no plan',
  'Forgive something out loud',
  'Make breakfast in bed',
  'Send a postcard to ourselves',
  'Try each other’s hobby for a day',
  'Do nothing together, on purpose',
];

/** The middle square is free, as in actual bingo. */
export const FREE_INDEX = Math.floor((BINGO_SIZE * BINGO_SIZE) / 2);

export function createBingoCard(ideas: string[], createdOn: string): BingoState {
  const needed = BINGO_SIZE * BINGO_SIZE;
  const pool = [...ideas];
  // Pad rather than fail if the caller passed too few, so a short custom
  // list still produces a playable card.
  while (pool.length < needed) pool.push(BINGO_IDEAS[pool.length % BINGO_IDEAS.length]);

  return {
    createdOn,
    squares: pool.slice(0, needed).map((text, i) => ({
      id: `b${i}`,
      text: i === FREE_INDEX ? 'Free square — you two, right now' : text,
      done: i === FREE_INDEX,
      doneOn: i === FREE_INDEX ? createdOn : undefined,
    })),
  };
}

export function toggleSquare(state: BingoState, id: string, on: string): BingoState {
  return {
    ...state,
    squares: state.squares.map((sq) => {
      if (sq.id !== id) return sq;
      // The free square stays ticked; unticking it would make lines
      // through the centre unreachable for no reason.
      if (state.squares.indexOf(sq) === FREE_INDEX) return sq;
      return sq.done
        ? { ...sq, done: false, doneOn: undefined }
        : { ...sq, done: true, doneOn: on };
    }),
  };
}

/** Every completed line: rows, columns and both diagonals. */
export function bingoLines(state: BingoState): number[][] {
  const n = BINGO_SIZE;
  const done = (i: number) => state.squares[i]?.done === true;
  const lines: number[][] = [];

  for (let r = 0; r < n; r++) {
    const row = Array.from({ length: n }, (_, c) => r * n + c);
    if (row.every(done)) lines.push(row);
  }
  for (let c = 0; c < n; c++) {
    const col = Array.from({ length: n }, (_, r) => r * n + c);
    if (col.every(done)) lines.push(col);
  }
  const down = Array.from({ length: n }, (_, i) => i * n + i);
  if (down.every(done)) lines.push(down);
  const up = Array.from({ length: n }, (_, i) => i * n + (n - 1 - i));
  if (up.every(done)) lines.push(up);

  return lines;
}

export function bingoProgress(state: BingoState): { done: number; total: number; lines: number } {
  return {
    done: state.squares.filter((s) => s.done).length,
    total: state.squares.length,
    lines: bingoLines(state).length,
  };
}

export function isBlackout(state: BingoState): boolean {
  return state.squares.every((s) => s.done);
}
