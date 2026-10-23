// Scribble: one of you draws the word, the other types guesses against a clock.
// Pure logic — see tests/scribble.test.mjs.
//
// Only the round lives here: the word, the guesses, the clock and the scores.
// The strokes never do — they go over a Realtime broadcast channel, because a
// drawing is hundreds of updates a minute and the shared board is versioned.
//
// Nothing reads the clock or calls Math.random at module scope: `rng` and
// `nowMs` are arguments, so a round can be replayed exactly in a test.

export type Rng = () => number;

/** Seconds on the clock for one round. */
export const ROUND_SECONDS = 90;

/** A correct guess is worth this at full time, and this at no time left. */
export const MAX_GUESS_POINTS = 100;
export const MIN_GUESS_POINTS = 20;
/** The drawer's cut of whatever the guesser scored — drawing well is half the game. */
export const DRAWER_SHARE = 0.5;

/**
 * Themed banks of drawable nouns. Drawable is the only rule: no abstractions,
 * nothing that needs writing a label to be recognised.
 */
export const SCRIBBLE_WORDS: Record<string, string[]> = {
  'Things in our flat': [
    'kettle', 'sofa', 'toaster', 'mirror', 'laundry basket', 'doormat', 'houseplant',
    'bookshelf', 'fridge magnet', 'hairbrush', 'umbrella', 'alarm clock', 'saucepan',
    'candle', 'remote control',
  ],
  'Places we’ve been': [
    'beach', 'airport', 'mountain', 'train station', 'lighthouse', 'museum', 'bridge',
    'campsite', 'pier', 'market stall', 'cathedral', 'ferry', 'hotel lobby', 'waterfall',
    'rooftop bar',
  ],
  'Food': [
    'pizza', 'noodles', 'pancake', 'avocado', 'ice cream', 'dumpling', 'birthday cake',
    'croissant', 'watermelon', 'fried egg', 'burrito', 'sushi', 'popcorn', 'cheese board',
    'iced coffee',
  ],
  'Animals': [
    'penguin', 'octopus', 'hedgehog', 'giraffe', 'sloth', 'jellyfish', 'owl', 'crab',
    'elephant', 'snail', 'flamingo', 'fox', 'whale', 'tortoise', 'bat',
  ],
};

export const SCRIBBLE_BANKS = Object.keys(SCRIBBLE_WORDS);

export interface ScribbleGuess {
  byId: string;
  /** As typed, so the list reads back the way they wrote it. */
  text: string;
  correct: boolean;
  nearMiss: boolean;
  at: number;
}

export interface ScribbleState {
  players: [string, string];
  drawerId: string;
  word: string;
  bank: string;
  round: number;
  startedAt: number;
  endsAt: number;
  guesses: ScribbleGuess[];
  scores: Record<string, number>;
  /** When the word was got, or null while the round is still open. */
  solvedAt: number | null;
  solvedBy: string | null;
  /** Words already used this session, so the bank doesn't repeat itself. */
  usedWords: string[];
  // useGameSession stores the board as a JSON blob, so the state has to be
  // assignable to Record<string, unknown>.
  [key: string]: unknown;
}

/**
 * A word from `bank` that hasn't been used yet. Once the bank is exhausted the
 * whole list comes back into play rather than returning nothing.
 */
export function pickWord(bank: string, rng: Rng, used: string[] = []): string {
  const all = SCRIBBLE_WORDS[bank];
  if (!all || all.length === 0) return '';
  const fresh = all.filter((w) => !used.includes(w));
  const pool = fresh.length > 0 ? fresh : all;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export function createRound(
  players: [string, string],
  drawerId: string,
  word: string,
  bank: string,
  nowMs: number
): ScribbleState {
  return {
    players,
    drawerId,
    word,
    bank,
    round: 1,
    startedAt: nowMs,
    endsAt: nowMs + ROUND_SECONDS * 1000,
    guesses: [],
    scores: { [players[0]]: 0, [players[1]]: 0 },
    solvedAt: null,
    solvedBy: null,
    usedWords: word ? [word] : [],
  };
}

/** Lowercase, trimmed, punctuation dropped, runs of whitespace collapsed. */
export function normaliseGuess(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCorrectGuess(word: string, guess: string): boolean {
  const target = normaliseGuess(word);
  const said = normaliseGuess(guess);
  return target.length > 0 && target === said;
}

/** Plain edit distance — short words only, so the simple matrix is fine. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * Close enough to say "so close", never close enough to win. The allowance
 * grows with the word so "hedgehog" tolerates a fumbled letter or two while
 * "owl" doesn't turn into "oil".
 */
export function isNearMiss(word: string, guess: string): boolean {
  const target = normaliseGuess(word);
  const said = normaliseGuess(guess);
  if (!target || !said || target === said) return false;
  const allowed = target.length <= 4 ? 1 : 2;
  return levenshtein(target, said) <= allowed;
}

export function roundOver(state: ScribbleState, nowMs: number): boolean {
  return state.solvedAt !== null || nowMs >= state.endsAt;
}

/** Whole seconds left, frozen at the moment the word was got. */
export function secondsLeft(state: ScribbleState, nowMs: number): number {
  const at = state.solvedAt ?? nowMs;
  return Math.max(0, Math.ceil((state.endsAt - at) / 1000));
}

/**
 * What a correct guess is worth right now. Both of them score: the guesser on
 * the clock, the drawer on a fixed share of it, so a drawing nobody can read
 * costs the drawer too.
 */
export function scoreCorrectGuess(state: ScribbleState, nowMs: number): { guesser: number; drawer: number } {
  const fraction = Math.max(0, Math.min(1, secondsLeft(state, nowMs) / ROUND_SECONDS));
  const guesser = MIN_GUESS_POINTS + Math.round((MAX_GUESS_POINTS - MIN_GUESS_POINTS) * fraction);
  return { guesser, drawer: Math.round(guesser * DRAWER_SHARE) };
}

/**
 * Records a guess. Returns null when it isn't allowed — the drawer guessing
 * their own word, a guess after the clock ran out, or nothing typed.
 *
 * The drawer check lives here rather than in the board's turn holder: the
 * guesser is the one submitting moves, so `turn_user_id` has to stay null or
 * the server refuses every move they make.
 */
export function addGuess(
  state: ScribbleState,
  byId: string,
  text: string,
  nowMs: number
): ScribbleState | null {
  if (!state.players.includes(byId)) return null;
  if (byId === state.drawerId) return null;
  if (roundOver(state, nowMs)) return null;
  if (!normaliseGuess(text)) return null;

  const correct = isCorrectGuess(state.word, text);
  const guess: ScribbleGuess = {
    byId,
    text: text.trim(),
    correct,
    nearMiss: !correct && isNearMiss(state.word, text),
    at: nowMs,
  };

  if (!correct) {
    return { ...state, guesses: [...state.guesses, guess] };
  }

  const award = scoreCorrectGuess(state, nowMs);
  return {
    ...state,
    guesses: [...state.guesses, guess],
    solvedAt: nowMs,
    solvedBy: byId,
    scores: {
      ...state.scores,
      [byId]: (state.scores[byId] ?? 0) + award.guesser,
      [state.drawerId]: (state.scores[state.drawerId] ?? 0) + award.drawer,
    },
  };
}

/**
 * The masked word the guesser sees. Letters appear as the clock runs down, but
 * one is always held back — the hint never hands over the answer.
 */
export function revealedHint(state: ScribbleState, nowMs: number): string {
  const chars = [...state.word];
  const letterPositions = chars.map((c, i) => (/[a-z0-9]/i.test(c) ? i : -1)).filter((i) => i >= 0);
  if (letterPositions.length === 0) return state.word;

  const span = Math.max(1, state.endsAt - state.startedAt);
  const elapsed = Math.max(0, Math.min(1, (nowMs - state.startedAt) / span));
  const count = Math.max(0, Math.min(Math.floor(elapsed * letterPositions.length), letterPositions.length - 1));

  // Every other letter first, so the shape arrives before the spelling does.
  const order = [
    ...letterPositions.filter((_, i) => i % 2 === 0),
    ...letterPositions.filter((_, i) => i % 2 === 1),
  ];
  const shown = new Set(order.slice(0, count));

  return chars
    .map((c, i) => (letterPositions.includes(i) ? (shown.has(i) ? c : '_') : c))
    .join('');
}

/** Swaps who draws, bumps the round, keeps the running scores. */
export function nextRound(state: ScribbleState, word: string, nowMs: number): ScribbleState {
  const drawerId = state.players[0] === state.drawerId ? state.players[1] : state.players[0];
  return {
    ...state,
    drawerId,
    word,
    round: state.round + 1,
    startedAt: nowMs,
    endsAt: nowMs + ROUND_SECONDS * 1000,
    guesses: [],
    solvedAt: null,
    solvedBy: null,
    usedWords: word ? [...state.usedWords, word] : state.usedWords,
  };
}
