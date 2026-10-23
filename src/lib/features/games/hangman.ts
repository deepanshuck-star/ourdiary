// Hangman where your partner sets the word. Pure logic — see
// tests/hangman.test.mjs.
//
// The partner-authored part is the point: an in-joke, a place you went, the
// name of the restaurant where you first met. A stock word list would make
// this the same game as everywhere else.

export const MAX_WRONG_GUESSES = 6;
export const MAX_PHRASE_LENGTH = 40;

export interface HangmanState {
  /** Stored uppercase. Spaces are revealed for free; letters are guessed. */
  phrase: string;
  hint: string;
  /** Who chose the phrase — they watch rather than guess. */
  setterId: string;
  guesserId: string;
  /** Uppercase letters guessed so far, in order. */
  guessed: string[];
  wrong: number;
  outcome: 'playing' | 'won' | 'lost';
}

/** Returns an error message, or null when the phrase can be used. */
export function validatePhrase(raw: string): string | null {
  const phrase = raw.trim();
  if (!phrase) return 'Pick a word or phrase first.';
  if (phrase.length > MAX_PHRASE_LENGTH) {
    return `Keep it under ${MAX_PHRASE_LENGTH} characters.`;
  }
  if (!/[a-z]/i.test(phrase)) return 'It needs at least one letter to guess.';
  // Digits and punctuation can't be guessed, so they'd be unwinnable blanks.
  if (!/^[a-z ]+$/i.test(phrase)) return 'Letters and spaces only, please.';
  return null;
}

export function createHangman(
  phrase: string,
  hint: string,
  setterId: string,
  guesserId: string
): HangmanState {
  return {
    phrase: phrase.trim().toUpperCase(),
    hint: hint.trim(),
    setterId,
    guesserId,
    guessed: [],
    wrong: 0,
    outcome: 'playing',
  };
}

/** The distinct letters that must be found (spaces don't count). */
export function lettersIn(phrase: string): string[] {
  return Array.from(new Set(phrase.toUpperCase().replace(/[^A-Z]/g, '').split('')));
}

export function isSolved(state: HangmanState): boolean {
  return lettersIn(state.phrase).every((letter) => state.guessed.includes(letter));
}

/** The phrase with unguessed letters masked: "O_R F_RST D_TE". */
export function maskedPhrase(state: HangmanState): string {
  return state.phrase
    .split('')
    .map((ch) => {
      if (ch === ' ') return ' ';
      return state.guessed.includes(ch) ? ch : '_';
    })
    .join('');
}

/**
 * Applies a guess. Returns null when it should be ignored — a finished game,
 * a repeat, or anything that isn't a single letter. Repeats are ignored
 * rather than penalised; costing a life for a mis-tap is just annoying.
 */
export function guessLetter(state: HangmanState, raw: string): HangmanState | null {
  if (state.outcome !== 'playing') return null;
  const letter = raw.trim().toUpperCase();
  if (!/^[A-Z]$/.test(letter)) return null;
  if (state.guessed.includes(letter)) return null;

  const guessed = [...state.guessed, letter];
  const hit = state.phrase.includes(letter);
  const wrong = hit ? state.wrong : state.wrong + 1;
  const next: HangmanState = { ...state, guessed, wrong };

  if (isSolved(next)) next.outcome = 'won';
  else if (wrong >= MAX_WRONG_GUESSES) next.outcome = 'lost';

  return next;
}

export function remainingGuesses(state: HangmanState): number {
  return Math.max(0, MAX_WRONG_GUESSES - state.wrong);
}

/** Letters guessed that aren't in the phrase, for the "misses" row. */
export function wrongLetters(state: HangmanState): string[] {
  return state.guessed.filter((letter) => !state.phrase.includes(letter));
}
