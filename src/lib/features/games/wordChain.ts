// Word chain: each word starts with the last letter of the one before.
// Pure logic — see tests/word-chain.test.mjs.
//
// No dictionary on purpose. Policing whether something is "a real word" needs
// a word list the app doesn't have, and the two of you can settle it faster
// than any list would. The rules enforced here are the mechanical ones:
// the right starting letter, and no repeats.

export const MIN_CHAIN_WORD = 2;
export const MAX_CHAIN_WORD = 24;

export interface ChainLink {
  word: string;
  playerId: string;
  at: string; // ISO
}

export interface WordChainState {
  links: ChainLink[];
  players: [string, string];
  /** Theme shown above the chain, e.g. "places we've been". Free text. */
  theme: string;
}

export function createWordChain(players: [string, string], theme = ''): WordChainState {
  return { links: [], players, theme: theme.trim() };
}

/** The letter the next word must begin with, or null for the opening word. */
export function requiredLetter(state: WordChainState): string | null {
  const last = state.links[state.links.length - 1];
  if (!last) return null;
  const letters = last.word.replace(/[^a-z]/gi, '');
  return letters ? letters[letters.length - 1].toUpperCase() : null;
}

function normalise(word: string): string {
  return word.trim().toLowerCase();
}

/** Returns an error message, or null when the word may be played. */
export function validateChainWord(state: WordChainState, raw: string): string | null {
  const word = raw.trim();
  if (!word) return 'Type a word first.';
  if (!/^[a-z]+$/i.test(word)) return 'Letters only — no spaces, digits or punctuation.';
  if (word.length < MIN_CHAIN_WORD) return 'A bit longer than that.';
  if (word.length > MAX_CHAIN_WORD) return `Keep it under ${MAX_CHAIN_WORD} letters.`;

  // Case-insensitive, so "Apple" can't follow "apple".
  if (state.links.some((l) => normalise(l.word) === normalise(word))) {
    return 'That one’s already in the chain.';
  }

  const needed = requiredLetter(state);
  if (needed && word[0].toUpperCase() !== needed) {
    return `It has to start with “${needed}”.`;
  }
  return null;
}

/**
 * Adds a word. Returns null when it breaks a rule — the caller shows
 * validateChainWord's message, so the two paths can't disagree.
 */
export function addChainWord(
  state: WordChainState,
  raw: string,
  playerId: string,
  at: Date = new Date()
): WordChainState | null {
  if (!state.players.includes(playerId)) return null;
  if (validateChainWord(state, raw) !== null) return null;
  return {
    ...state,
    links: [...state.links, { word: raw.trim(), playerId, at: at.toISOString() }],
  };
}

export function otherChainPlayer(state: WordChainState, playerId: string): string {
  return state.players[0] === playerId ? state.players[1] : state.players[0];
}

export function chainScores(state: WordChainState): Record<string, number> {
  const tally: Record<string, number> = { [state.players[0]]: 0, [state.players[1]]: 0 };
  for (const link of state.links) {
    if (link.playerId in tally) tally[link.playerId]++;
  }
  return tally;
}

/** Suggested themes, so an empty chain isn't a blank page. */
export const CHAIN_THEMES = [
  'Anything goes',
  'Places we’ve been',
  'Food we love',
  'Things in this room',
  'Films we’ve watched together',
  'Words that remind you of me',
];
