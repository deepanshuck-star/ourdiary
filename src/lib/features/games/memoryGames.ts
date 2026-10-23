// Games built from the couple's own history. Pure logic — see
// tests/memory-games.test.mjs.
//
// These are the ones no other app can offer: the questions come from their
// memories, photos and gifts. They also get better the longer the app is
// used, which generic puzzles never do.
//
// Nothing here calls Math.random at module scope or reads the clock: a
// `rng` is passed in so a round can be reproduced in a test, and "now" is
// always an argument.

export type Rng = () => number;

/** Fisher-Yates, left pure by taking its randomness as an argument. */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickDistinct<T>(items: T[], count: number, rng: Rng = Math.random): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, Math.min(count, items.length)));
}

// ------------------------------------------------------- Guess the Memory ---

export interface MemoryLike {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  location?: string;
  category?: string;
  photos?: { url: string }[];
}

export type GuessField = 'year' | 'location' | 'title';

export interface GuessRound {
  memoryId: string;
  photoUrl: string;
  field: GuessField;
  /** The right answer, and three wrong ones, already shuffled. */
  options: string[];
  answer: string;
}

/** Memories we can actually show a picture of. */
export function memoriesWithPhotos<T extends MemoryLike>(memories: T[]): T[] {
  return memories.filter((m) => (m.photos?.length ?? 0) > 0);
}

export function yearOf(date: string): string {
  return /^\d{4}/.test(date) ? date.slice(0, 4) : '';
}

function fieldValue(memory: MemoryLike, field: GuessField): string {
  if (field === 'year') return yearOf(memory.date);
  if (field === 'location') return (memory.location || '').trim();
  return memory.title.trim();
}

/**
 * Builds one round, or null when there isn't enough to ask about — fewer
 * than two distinct answers would make it a question with one option.
 *
 * Decoys come from the couple's own other memories where possible, which is
 * what makes the question hard: "was that Goa or Manali" beats "was that
 * Goa or Paris".
 */
export function buildGuessRound<T extends MemoryLike>(
  memories: T[],
  field: GuessField,
  rng: Rng = Math.random
): GuessRound | null {
  const pool = memoriesWithPhotos(memories).filter((m) => fieldValue(m, field) !== '');
  if (pool.length === 0) return null;

  const subject = pool[Math.floor(rng() * pool.length)];
  const answer = fieldValue(subject, field);

  const decoyPool = Array.from(
    new Set(
      memories
        .map((m) => fieldValue(m, field))
        .filter((v) => v !== '' && v !== answer)
    )
  );
  if (decoyPool.length === 0) return null;

  const decoys = pickDistinct(decoyPool, 3, rng);
  const photos = subject.photos ?? [];
  return {
    memoryId: subject.id,
    photoUrl: photos[Math.floor(rng() * photos.length)].url,
    field,
    options: shuffle([answer, ...decoys], rng),
    answer,
  };
}

/** Which questions can be asked at all, given what's been filled in. */
export function availableGuessFields<T extends MemoryLike>(memories: T[]): GuessField[] {
  const fields: GuessField[] = ['year', 'location', 'title'];
  return fields.filter((f) => buildGuessRound(memories, f, () => 0) !== null);
}

// ----------------------------------------------------------- Timeline Rush ---

export interface TimelineRound {
  /** Presented out of order; the player drags them into sequence. */
  items: { id: string; title: string; date: string }[];
  /** Correct ids, oldest first. */
  solution: string[];
}

export function buildTimelineRound<T extends MemoryLike>(
  memories: T[],
  count = 5,
  rng: Rng = Math.random
): TimelineRound | null {
  const dated = memories.filter((m) => /^\d{4}-\d{2}-\d{2}$/.test(m.date));
  // Two items is a coin flip, not a puzzle.
  if (dated.length < 3) return null;

  const chosen = pickDistinct(dated, Math.min(count, dated.length), rng);
  const solution = [...chosen]
    .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))
    .map((m) => m.id);

  let items = shuffle(chosen, rng).map((m) => ({ id: m.id, title: m.title, date: m.date }));
  // Handing back the answer already in order is a non-puzzle; nudge it.
  if (items.length > 1 && items.every((item, i) => item.id === solution[i])) {
    items = [...items.slice(1), items[0]];
  }
  return { items, solution };
}

/** How many items sit in the right place — partial credit, not pass/fail. */
export function scoreTimeline(order: string[], solution: string[]): number {
  return order.reduce((score, id, i) => (solution[i] === id ? score + 1 : score), 0);
}

export function isTimelineSolved(order: string[], solution: string[]): boolean {
  return order.length === solution.length && order.every((id, i) => solution[i] === id);
}

// ------------------------------------------------------------ Where Were We ---

export interface PlacedMemory {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
}

export interface WhereRound {
  memoryId: string;
  title: string;
  /** Correct place, plus decoys, shuffled — the player picks one on the globe. */
  options: PlacedMemory[];
  answerId: string;
}

export function buildWhereRound(
  placed: PlacedMemory[],
  rng: Rng = Math.random,
  optionCount = 4
): WhereRound | null {
  if (placed.length < 2) return null;
  const subject = placed[Math.floor(rng() * placed.length)];
  const decoys = pickDistinct(
    placed.filter((p) => p.id !== subject.id),
    Math.max(1, optionCount - 1),
    rng
  );
  return {
    memoryId: subject.id,
    title: subject.title,
    options: shuffle([subject, ...decoys], rng),
    answerId: subject.id,
  };
}

/** Great-circle distance in km, for "you were 340km off". */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// --------------------------------------------------------------- Gift Recall ---

export interface GiftLikeForGame {
  id: string;
  title: string;
  occasion?: string | null;
  fromUserId: string;
  toUserId: string;
  givenOn?: string | null;
}

export type GiftQuestion = 'who' | 'occasion';

export interface GiftRound {
  giftId: string;
  giftTitle: string;
  question: GiftQuestion;
  options: string[];
  answer: string;
}

/**
 * One gift question. `names` maps a user id to a display name so the "who"
 * question can be asked in words rather than UUIDs.
 */
export function buildGiftRound(
  gifts: GiftLikeForGame[],
  names: Record<string, string>,
  question: GiftQuestion,
  rng: Rng = Math.random
): GiftRound | null {
  const pool =
    question === 'occasion'
      ? gifts.filter((g) => (g.occasion || '').trim() !== '')
      : gifts.filter((g) => names[g.fromUserId]);
  if (pool.length === 0) return null;

  const subject = pool[Math.floor(rng() * pool.length)];

  if (question === 'who') {
    const everyone = Array.from(new Set(Object.values(names)));
    // With only one named person there is nothing to choose between.
    if (everyone.length < 2) return null;
    return {
      giftId: subject.id,
      giftTitle: subject.title,
      question,
      options: shuffle(everyone, rng),
      answer: names[subject.fromUserId],
    };
  }

  const answer = (subject.occasion || '').trim();
  const decoyPool = Array.from(
    new Set(gifts.map((g) => (g.occasion || '').trim()).filter((o) => o !== '' && o !== answer))
  );
  if (decoyPool.length === 0) return null;
  return {
    giftId: subject.id,
    giftTitle: subject.title,
    question,
    options: shuffle([answer, ...pickDistinct(decoyPool, 3, rng)], rng),
    answer,
  };
}

// -------------------------------------------------- How Well Do You Know Me ---

export const KNOW_ME_PROMPTS = [
  'My go-to comfort food',
  'The film I could rewatch forever',
  'My worst habit, in my own words',
  'What I wanted to be as a child',
  'My ideal lazy Sunday',
  'The song I play on repeat right now',
  'What cheers me up when nothing else does',
  'My most irrational fear',
  'The thing I am proudest of',
  'What I would spend a free afternoon doing',
  'My order at our usual place',
  'The compliment I secretly like most',
];

export interface KnowMeAnswer {
  prompt: string;
  /** Written by the person the question is about. */
  truth: string;
  /** Their partner's attempt. Absent until they've guessed. */
  guess?: string;
  /** Scored by the author, who is the only one who can judge it. */
  correct?: boolean;
}

export interface KnowMeRound {
  /** Whose answers these are. */
  aboutId: string;
  answers: KnowMeAnswer[];
  phase: 'writing' | 'guessing' | 'scoring' | 'done';
}

export function createKnowMeRound(aboutId: string, prompts: string[]): KnowMeRound {
  return {
    aboutId,
    answers: prompts.map((prompt) => ({ prompt, truth: '' })),
    phase: 'writing',
  };
}

export function knowMeScore(round: KnowMeRound): { correct: number; total: number } {
  const scored = round.answers.filter((a) => a.correct !== undefined);
  return { correct: scored.filter((a) => a.correct).length, total: round.answers.length };
}

/** Writing is finished when every prompt has an answer. */
export function isKnowMeWritten(round: KnowMeRound): boolean {
  return round.answers.length > 0 && round.answers.every((a) => a.truth.trim() !== '');
}

export function isKnowMeGuessed(round: KnowMeRound): boolean {
  return round.answers.length > 0 && round.answers.every((a) => (a.guess ?? '').trim() !== '');
}
