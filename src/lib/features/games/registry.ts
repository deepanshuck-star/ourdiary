// The arcade's catalogue. One entry per game, so the tile grid, the rules
// shown on each card and the routing all read from the same place — adding a
// game means adding a row here and a component, not editing three files.
//
// `rules` is what appears under the title on the tile: the two or three
// things you need to know to decide whether to play, not a full manual.

export type GameCategory = 'history' | 'head-to-head' | 'talk' | 'together';

/** What a game needs before it can be played at all. */
export type GameRequirement = 'partner' | 'memories' | 'photos' | 'dated-memories' | 'placed-memories' | 'gifts';

export interface GameMeta {
  id: string;
  title: string;
  tagline: string;
  rules: string[];
  category: GameCategory;
  /** Shown as a chip on the tile. */
  players: 'Just you' | 'Two players' | 'Take turns';
  requires?: GameRequirement[];
}

export const CATEGORIES: { id: GameCategory; title: string; blurb: string }[] = [
  { id: 'history', title: 'From your own history', blurb: 'Built from your memories, photos and gifts. These get better the longer you use the app.' },
  { id: 'head-to-head', title: 'Head to head', blurb: 'Take a turn each. Moves appear on the other phone as you make them.' },
  { id: 'talk', title: 'Things to talk about', blurb: 'No winner. Prompts that get you somewhere a normal evening wouldn’t.' },
  { id: 'together', title: 'Make something together', blurb: 'Nobody loses. You end up with something you both built.' },
];

export const GAMES: GameMeta[] = [
  // ------------------------------------------------- From your own history ---
  {
    id: 'guessmemory',
    title: 'Guess the Memory',
    tagline: 'A photo, with the story hidden',
    rules: [
      'A photo from your diary appears with its details covered.',
      'Pick the right year, place or title from four options.',
      'The wrong answers come from your own other memories, so it’s harder than it looks.',
    ],
    category: 'history',
    players: 'Just you',
    requires: ['photos'],
  },
  {
    id: 'timeline',
    title: 'Timeline Rush',
    tagline: 'Put five moments back in order',
    rules: [
      'Five memories arrive shuffled.',
      'Drag them oldest to newest.',
      'Scored on how many land in the right place — partial credit counts.',
    ],
    category: 'history',
    players: 'Just you',
    requires: ['dated-memories'],
  },
  {
    id: 'wherewerewe',
    title: 'Where Were We?',
    tagline: 'Find the place on the map',
    rules: [
      'A memory’s title appears without its location.',
      'Pick which of your places it happened in.',
      'Miss it and you’re told how far off you were.',
    ],
    category: 'history',
    players: 'Just you',
    requires: ['placed-memories'],
  },
  {
    id: 'giftrecall',
    title: 'Gift Recall',
    tagline: 'Who gave it, and what for?',
    rules: [
      'A gift from your wardrobe appears.',
      'Say who gave it, or what the occasion was.',
      'Needs a few gifts logged before the questions get interesting.',
    ],
    category: 'history',
    players: 'Just you',
    requires: ['gifts'],
  },
  {
    id: 'knowme',
    title: 'How Well Do You Know Me?',
    tagline: 'You answer, they guess',
    rules: [
      'One of you writes honest answers about yourself.',
      'The other guesses each one without seeing them.',
      'Only the author can mark a guess right — they’re the one who knows.',
    ],
    category: 'history',
    players: 'Take turns',
    requires: ['partner'],
  },

  // ------------------------------------------------------------ Head to head ---
  {
    id: 'connect4',
    title: 'Connect 4',
    tagline: 'Four in a row, properly',
    rules: [
      'Drop a disc into a column; it falls to the bottom.',
      'Four in a line wins — across, down or diagonally.',
      'Unlike noughts and crosses, this one can actually be won.',
    ],
    category: 'head-to-head',
    players: 'Two players',
    requires: ['partner'],
  },
  {
    id: 'dots',
    title: 'Dots and Boxes',
    tagline: 'Close a box, go again',
    rules: [
      'Take turns drawing one line between two dots.',
      'Complete a box and it’s yours — and you move again.',
      'Most boxes when the grid is full wins.',
    ],
    category: 'head-to-head',
    players: 'Two players',
    requires: ['partner'],
  },
  {
    id: 'hangman',
    title: 'Hangman',
    tagline: 'They set the word',
    rules: [
      'One of you picks a word or phrase — an in-joke, a place, a name.',
      'The other guesses a letter at a time.',
      'Six wrong guesses and it’s over.',
    ],
    category: 'head-to-head',
    players: 'Two players',
    requires: ['partner'],
  },
  {
    id: 'wordchain',
    title: 'Word Chain',
    tagline: 'End a word, start the next',
    rules: [
      'Each word must start with the last letter of the one before.',
      'No repeats, and no going back.',
      'There’s no dictionary — if one of you objects, argue it out.',
    ],
    category: 'head-to-head',
    players: 'Two players',
    requires: ['partner'],
  },
  {
    id: 'tictactoe',
    title: 'Hearts & Kisses',
    tagline: 'Tic-tac-toe, with stakes',
    rules: [
      'The usual three in a row.',
      'The loser owes whatever the stake card says.',
      'Mostly ends in a draw — that’s the game, not a bug.',
    ],
    category: 'head-to-head',
    players: 'Two players',
  },
  {
    id: 'memorymatch',
    title: 'Photo Memory Match',
    tagline: 'Find the pairs',
    rules: [
      'Sixteen cards face down, eight pairs.',
      'Turn two at a time and remember what you saw.',
      'Uses your own photos when you have them.',
    ],
    category: 'head-to-head',
    players: 'Just you',
  },
  {
    id: 'wordle',
    title: 'Love Wordle',
    tagline: 'Five letters, six goes',
    rules: [
      'A new word every day, drawn from a romantic list.',
      'Green is right letter, right place; amber is right letter, wrong place.',
      'Six attempts, then it’s tomorrow’s problem.',
    ],
    category: 'head-to-head',
    players: 'Just you',
  },

  // ------------------------------------------------------ Things to talk about ---
  {
    id: 'thirtysix',
    title: '36 Questions',
    tagline: 'The ones that actually work',
    rules: [
      'Arthur Aron’s set, in three parts that get deeper as you go.',
      'Both answer each question before moving on.',
      'Don’t skip ahead — the order is the whole point.',
    ],
    category: 'talk',
    players: 'Take turns',
  },
  {
    id: 'twotruths',
    title: 'Two Truths and a Lie',
    tagline: 'Three statements, one invented',
    rules: [
      'Write three things about yourself; mark which is false.',
      'Your partner picks the lie.',
      'The good ones are plausible, not outrageous.',
    ],
    category: 'talk',
    players: 'Take turns',
    requires: ['partner'],
  },
  {
    id: 'rosebudthorn',
    title: 'Rose, Bud, Thorn',
    tagline: 'A daily three-line check-in',
    rules: [
      'Rose: the best bit of today. Bud: what you’re looking forward to.',
      'Thorn: the hard part — the one people skip.',
      'Keeps a streak, and you can read back through old days.',
    ],
    category: 'talk',
    players: 'Take turns',
  },
  {
    id: 'truthordare',
    title: 'Truth or Dare',
    tagline: 'Romantic through to spicy',
    rules: [
      'Pick a category and a type, or let it choose.',
      'Some dares are timed.',
      'You can add your own prompts.',
    ],
    category: 'talk',
    players: 'Take turns',
  },
  {
    id: 'wouldyourather',
    title: 'Would You Rather',
    tagline: 'Dilemmas, and Never Have I Ever',
    rules: [
      'Two options, no third choice.',
      'Second tab has Never Have I Ever.',
      'Answer first, justify afterwards.',
    ],
    category: 'talk',
    players: 'Take turns',
  },

  // ------------------------------------------------- Make something together ---
  {
    id: 'storytennis',
    title: 'Story Tennis',
    tagline: 'One sentence each',
    rules: [
      'Take turns adding a single sentence.',
      'No planning allowed, and no editing theirs.',
      'Finished stories are kept.',
    ],
    category: 'together',
    players: 'Take turns',
    requires: ['partner'],
  },
  {
    id: 'bingo',
    title: 'Relationship Bingo',
    tagline: 'Twenty-five things to do',
    rules: [
      'A 5x5 card of things to do together, ticked off over months.',
      'A full line wins — you don’t need the whole card.',
      'The middle square is free.',
    ],
    category: 'together',
    players: 'Take turns',
  },
  {
    id: 'doodle',
    title: 'Doodle Canvas',
    tagline: 'Draw something for them',
    rules: [
      'Draw with your finger or mouse.',
      'Pick a prompt, or ignore it entirely.',
      'Save what you make.',
    ],
    category: 'together',
    players: 'Just you',
  },
];

export function gameById(id: string | null | undefined): GameMeta | null {
  if (!id) return null;
  return GAMES.find((g) => g.id === id) ?? null;
}

export function gamesInCategory(category: GameCategory): GameMeta[] {
  return GAMES.filter((g) => g.category === category);
}

export interface LibraryStats {
  hasPartner: boolean;
  memories: number;
  photos: number;
  datedMemories: number;
  placedMemories: number;
  gifts: number;
}

/**
 * Why a game can't be played yet, or null when it can. Used to put an honest
 * note on the tile instead of letting someone open a game that will only show
 * them an empty state.
 */
export function unmetRequirement(game: GameMeta, stats: LibraryStats): string | null {
  for (const need of game.requires ?? []) {
    if (need === 'partner' && !stats.hasPartner) {
      return 'Needs your partner to have joined your space.';
    }
    if (need === 'photos' && stats.photos < 2) {
      return 'Add a couple of photos to your memories first.';
    }
    if (need === 'memories' && stats.memories < 2) {
      return 'Add a couple of memories first.';
    }
    if (need === 'dated-memories' && stats.datedMemories < 3) {
      return 'Needs at least three memories with dates.';
    }
    if (need === 'placed-memories' && stats.placedMemories < 2) {
      return 'Needs at least two memories with a location.';
    }
    if (need === 'gifts' && stats.gifts < 2) {
      return 'Log a couple of gifts in the wardrobe first.';
    }
  }
  return null;
}
