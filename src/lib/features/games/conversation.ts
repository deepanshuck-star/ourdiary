// Conversation games: mostly content, almost no mechanics. Pure — see
// tests/conversation-games.test.mjs.

// --------------------------------------------- 36 Questions to Fall in Love ---
//
// Arthur Aron's 1997 closeness-generating procedure, in three sets of twelve
// that deepen as you go. The escalation is the design — asking set III cold
// doesn't work, which is why the sets are kept in order rather than shuffled.

export interface AronQuestion {
  id: string;
  set: 1 | 2 | 3;
  text: string;
}

export const THIRTY_SIX_QUESTIONS: AronQuestion[] = [
  { id: 'q1', set: 1, text: 'Given the choice of anyone in the world, whom would you want as a dinner guest?' },
  { id: 'q2', set: 1, text: 'Would you like to be famous? In what way?' },
  { id: 'q3', set: 1, text: 'Before making a telephone call, do you ever rehearse what you are going to say? Why?' },
  { id: 'q4', set: 1, text: 'What would constitute a “perfect” day for you?' },
  { id: 'q5', set: 1, text: 'When did you last sing to yourself? To someone else?' },
  { id: 'q6', set: 1, text: 'If you were able to live to the age of 90 and retain either the mind or body of a 30-year-old for the last 60 years of your life, which would you want?' },
  { id: 'q7', set: 1, text: 'Do you have a secret hunch about how you will die?' },
  { id: 'q8', set: 1, text: 'Name three things you and your partner appear to have in common.' },
  { id: 'q9', set: 1, text: 'For what in your life do you feel most grateful?' },
  { id: 'q10', set: 1, text: 'If you could change anything about the way you were raised, what would it be?' },
  { id: 'q11', set: 1, text: 'Take four minutes and tell your partner your life story in as much detail as possible.' },
  { id: 'q12', set: 1, text: 'If you could wake up tomorrow having gained any one quality or ability, what would it be?' },

  { id: 'q13', set: 2, text: 'If a crystal ball could tell you the truth about yourself, your life, the future or anything else, what would you want to know?' },
  { id: 'q14', set: 2, text: 'Is there something that you’ve dreamed of doing for a long time? Why haven’t you done it?' },
  { id: 'q15', set: 2, text: 'What is the greatest accomplishment of your life?' },
  { id: 'q16', set: 2, text: 'What do you value most in a friendship?' },
  { id: 'q17', set: 2, text: 'What is your most treasured memory?' },
  { id: 'q18', set: 2, text: 'What is your most terrible memory?' },
  { id: 'q19', set: 2, text: 'If you knew that in one year you would die suddenly, would you change anything about the way you are now living? Why?' },
  { id: 'q20', set: 2, text: 'What does friendship mean to you?' },
  { id: 'q21', set: 2, text: 'What roles do love and affection play in your life?' },
  { id: 'q22', set: 2, text: 'Alternate sharing something you consider a positive characteristic of your partner. Share a total of five items.' },
  { id: 'q23', set: 2, text: 'How close and warm is your family? Do you feel your childhood was happier than most other people’s?' },
  { id: 'q24', set: 2, text: 'How do you feel about your relationship with your mother?' },

  { id: 'q25', set: 3, text: 'Make three true “we” statements each. For instance, “We are both in this room feeling…”' },
  { id: 'q26', set: 3, text: 'Complete this sentence: “I wish I had someone with whom I could share…”' },
  { id: 'q27', set: 3, text: 'If you were going to become a close friend with your partner, please share what would be important for them to know.' },
  { id: 'q28', set: 3, text: 'Tell your partner what you like about them; be very honest, saying things you might not say to someone you’ve just met.' },
  { id: 'q29', set: 3, text: 'Share with your partner an embarrassing moment in your life.' },
  { id: 'q30', set: 3, text: 'When did you last cry in front of another person? By yourself?' },
  { id: 'q31', set: 3, text: 'Tell your partner something that you like about them already.' },
  { id: 'q32', set: 3, text: 'What, if anything, is too serious to be joked about?' },
  { id: 'q33', set: 3, text: 'If you were to die this evening with no opportunity to communicate with anyone, what would you most regret not having told someone? Why haven’t you told them yet?' },
  { id: 'q34', set: 3, text: 'Your house, containing everything you own, catches fire. After saving your loved ones and pets, you have time to safely make a final dash to save any one item. What would it be? Why?' },
  { id: 'q35', set: 3, text: 'Of all the people in your family, whose death would you find most disturbing? Why?' },
  { id: 'q36', set: 3, text: 'Share a personal problem and ask your partner’s advice on how they might handle it. Also, ask your partner to reflect back to you how you seem to be feeling about the problem you have chosen.' },
];

export const SET_BLURBS: Record<1 | 2 | 3, string> = {
  1: 'Warming up — light, curious, easy to answer.',
  2: 'Going deeper — memories, values, the things that shaped you.',
  3: 'Closest — honest, vulnerable, not for a first date.',
};

export function questionsInSet(set: 1 | 2 | 3): AronQuestion[] {
  return THIRTY_SIX_QUESTIONS.filter((q) => q.set === set);
}

/**
 * The next unanswered question, in order. Returns null when all 36 are done.
 * Order matters here: the sets are designed to escalate.
 */
export function nextAronQuestion(answeredIds: string[]): AronQuestion | null {
  return THIRTY_SIX_QUESTIONS.find((q) => !answeredIds.includes(q.id)) ?? null;
}

export function aronProgress(answeredIds: string[]): { done: number; total: number; set: 1 | 2 | 3 } {
  const done = THIRTY_SIX_QUESTIONS.filter((q) => answeredIds.includes(q.id)).length;
  const next = nextAronQuestion(answeredIds);
  return { done, total: THIRTY_SIX_QUESTIONS.length, set: next?.set ?? 3 };
}

// ------------------------------------------------------- Two Truths and a Lie ---

export interface TwoTruthsRound {
  authorId: string;
  /** Exactly three, in the order shown. */
  statements: string[];
  /** Index into `statements` of the false one. */
  lieIndex: number;
  /** The partner's pick, once they've guessed. */
  guessIndex?: number;
}

/** Returns an error message, or null when the round can be submitted. */
export function validateTwoTruths(statements: string[], lieIndex: number): string | null {
  if (statements.length !== 3) return 'Write exactly three statements.';
  if (statements.some((s) => s.trim() === '')) return 'Fill in all three.';
  if (statements.some((s) => s.trim().length > 200)) return 'Keep each one under 200 characters.';
  const unique = new Set(statements.map((s) => s.trim().toLowerCase()));
  if (unique.size !== 3) return 'Make the three different from each other.';
  if (lieIndex < 0 || lieIndex > 2) return 'Mark which one is the lie.';
  return null;
}

export function isTwoTruthsCorrect(round: TwoTruthsRound): boolean | null {
  if (round.guessIndex === undefined) return null;
  return round.guessIndex === round.lieIndex;
}

// --------------------------------------------------------- Rose / Bud / Thorn ---
//
// A daily check-in more than a game: the best thing, the thing you're looking
// forward to, the hard thing. Kept per day so it becomes a habit you can
// look back through.

export interface RoseBudThorn {
  date: string; // YYYY-MM-DD, local
  rose: string;
  bud: string;
  thorn: string;
}

export const RBT_LABELS = {
  rose: { title: 'Rose', blurb: 'The best bit of today' },
  bud: { title: 'Bud', blurb: 'Something you’re looking forward to' },
  thorn: { title: 'Thorn', blurb: 'The hard part — say it out loud' },
} as const;

export function emptyRoseBudThorn(date: string): RoseBudThorn {
  return { date, rose: '', bud: '', thorn: '' };
}

export function isRbtComplete(entry: RoseBudThorn): boolean {
  return entry.rose.trim() !== '' && entry.bud.trim() !== '' && entry.thorn.trim() !== '';
}

/** Partial entries count — saying one of the three is still showing up. */
export function isRbtStarted(entry: RoseBudThorn): boolean {
  return entry.rose.trim() !== '' || entry.bud.trim() !== '' || entry.thorn.trim() !== '';
}

/**
 * Consecutive days ending today, counting any started entry. Dates are
 * compared as local YYYY-MM-DD strings, so an entry made at 1am counts for
 * that day rather than the one before.
 */
export function rbtStreak(entries: RoseBudThorn[], today: string): number {
  const started = new Set(entries.filter(isRbtStarted).map((e) => e.date));
  if (!started.has(today)) return 0;
  let streak = 0;
  const cursor = new Date(`${today}T12:00:00`);
  // Midday avoids a DST shift moving the cursor across a day boundary.
  while (true) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    if (!started.has(`${y}-${m}-${d}`)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
