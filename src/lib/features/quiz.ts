// Couple quizzes: "You or me?" and Love Languages. Pure, import-free logic (node-testable).

export type PartnerKey = 'user_1' | 'user_2';

// ---------- You or me? ----------

/** Each person answers from their own point of view. */
export type YouOrMeAnswer = 'me' | 'partner' | 'both';

export const YOU_OR_ME_QUESTIONS: string[] = [
  'Who is more likely to plan a surprise date?',
  'Who is more likely to cry during a movie?',
  'Who is more likely to say “I love you” first in the morning?',
  'Who is more likely to get lost, even with a map?',
  'Who is more likely to apologise first after a disagreement?',
  'Who is more likely to steal the blanket at night?',
  'Who is more likely to remember a tiny detail from your first date?',
  'Who is more likely to suggest a spontaneous trip?',
  'Who is more likely to order dessert “just to share”?',
  'Who is more likely to fall asleep first on movie night?',
  'Who is more likely to keep every little note and ticket stub?',
  'Who is more likely to sing loudly in the car?',
];

export type YouOrMePick = PartnerKey | 'both';

export interface YouOrMeComparison {
  question: string;
  /** Who partner 1 said, translated to an actual person. */
  user_1: YouOrMePick | null;
  /** Who partner 2 said, translated to an actual person. */
  user_2: YouOrMePick | null;
  agree: boolean;
}

export function otherPartner(p: PartnerKey): PartnerKey {
  return p === 'user_1' ? 'user_2' : 'user_1';
}

/** Translate a first-person answer ("me") into the person it points at. */
export function resolvePick(answerer: PartnerKey, answer: YouOrMeAnswer | null | undefined): YouOrMePick | null {
  if (!answer) return null;
  if (answer === 'both') return 'both';
  return answer === 'me' ? answerer : otherPartner(answerer);
}

export function compareYouOrMe(
  answers1: (YouOrMeAnswer | null)[],
  answers2: (YouOrMeAnswer | null)[],
  questions: string[] = YOU_OR_ME_QUESTIONS
): YouOrMeComparison[] {
  return questions.map((question, i) => {
    const a = resolvePick('user_1', answers1[i]);
    const b = resolvePick('user_2', answers2[i]);
    return { question, user_1: a, user_2: b, agree: a !== null && a === b };
  });
}

/** In-sync answers vs. the ones worth a conversation — deliberately not a score. */
export function summariseYouOrMe(items: YouOrMeComparison[]) {
  return {
    inSync: items.filter((i) => i.agree),
    toTalkAbout: items.filter((i) => !i.agree),
  };
}

// ---------- Love languages ----------

export type LoveLanguage = 'words' | 'time' | 'gifts' | 'service' | 'touch';

export const LOVE_LANGUAGES: LoveLanguage[] = ['words', 'time', 'gifts', 'service', 'touch'];

export const LOVE_LANGUAGE_LABELS: Record<LoveLanguage, { name: string; blurb: string }> = {
  words: { name: 'Words of affirmation', blurb: 'Kind words, notes and being told how much you matter.' },
  time: { name: 'Quality time', blurb: 'Undivided attention and unhurried time together.' },
  gifts: { name: 'Receiving gifts', blurb: 'Thoughtful little tokens that say “I was thinking of you”.' },
  service: { name: 'Acts of service', blurb: 'Help that lightens the load without being asked.' },
  touch: { name: 'Physical touch', blurb: 'Hugs, held hands and closeness.' },
};

export interface LoveLanguageQuestion {
  prompt: string;
  a: { text: string; language: LoveLanguage };
  b: { text: string; language: LoveLanguage };
}

// Ten questions = every pair of the five languages exactly once, so the quiz is balanced.
export const LOVE_LANGUAGE_QUESTIONS: LoveLanguageQuestion[] = [
  {
    prompt: 'After a long day, what would feel best?',
    a: { text: 'Hearing “I’m so proud of you”', language: 'words' },
    b: { text: 'An evening together, phones away', language: 'time' },
  },
  {
    prompt: 'Which surprise would make you smile more?',
    a: { text: 'A sweet note tucked in your bag', language: 'words' },
    b: { text: 'A small gift that shows they listened', language: 'gifts' },
  },
  {
    prompt: 'When you’re stressed, what helps most?',
    a: { text: 'Words of encouragement', language: 'words' },
    b: { text: 'Them taking a chore off your plate', language: 'service' },
  },
  {
    prompt: 'Which feels more like love?',
    a: { text: 'Being told what they adore about you', language: 'words' },
    b: { text: 'A long, warm hug', language: 'touch' },
  },
  {
    prompt: 'For your birthday you’d rather…',
    a: { text: 'Spend the whole day together', language: 'time' },
    b: { text: 'Unwrap something chosen just for you', language: 'gifts' },
  },
  {
    prompt: 'On a lazy Sunday, you’d love them to…',
    a: { text: 'Go on a slow walk with you', language: 'time' },
    b: { text: 'Make breakfast so you can sleep in', language: 'service' },
  },
  {
    prompt: 'Watching a film at home, you’d prefer…',
    a: { text: 'Talking about it together after', language: 'time' },
    b: { text: 'Cuddling up the whole way through', language: 'touch' },
  },
  {
    prompt: 'Coming home from a trip, what means more?',
    a: { text: 'A souvenir they picked up for you', language: 'gifts' },
    b: { text: 'Finding they handled the errands', language: 'service' },
  },
  {
    prompt: 'Which little moment would you treasure?',
    a: { text: 'Flowers for no reason', language: 'gifts' },
    b: { text: 'Holding hands while you walk', language: 'touch' },
  },
  {
    prompt: 'When you feel low, you’d rather they…',
    a: { text: 'Quietly take care of what needs doing', language: 'service' },
    b: { text: 'Pull you close and just hold you', language: 'touch' },
  },
];

export type LoveLanguageChoice = 'a' | 'b';

export interface LoveLanguageScore {
  language: LoveLanguage;
  score: number;
}

/** Rank all five languages, highest first. Ties keep the canonical order. */
export function scoreLoveLanguages(
  choices: (LoveLanguageChoice | null)[],
  questions: LoveLanguageQuestion[] = LOVE_LANGUAGE_QUESTIONS
): LoveLanguageScore[] {
  const counts: Record<LoveLanguage, number> = { words: 0, time: 0, gifts: 0, service: 0, touch: 0 };
  questions.forEach((q, i) => {
    const c = choices[i];
    if (c === 'a') counts[q.a.language] += 1;
    else if (c === 'b') counts[q.b.language] += 1;
  });
  return LOVE_LANGUAGES.map((language) => ({ language, score: counts[language] })).sort(
    (x, y) => y.score - x.score || LOVE_LANGUAGES.indexOf(x.language) - LOVE_LANGUAGES.indexOf(y.language)
  );
}

// ---------- Save & resume ----------

export interface QuizProgress<T> {
  answers: (T | null)[];
  index: number;
  done: boolean;
}

export function emptyProgress<T>(length: number): QuizProgress<T> {
  return { answers: Array.from({ length }, () => null), index: 0, done: false };
}

/**
 * Record an answer and step forward. After the last question the quiz finishes, unless an
 * earlier question is still blank — then it jumps back to that one.
 */
export function answerQuestion<T>(progress: QuizProgress<T>, index: number, value: T): QuizProgress<T> {
  const answers = progress.answers.slice();
  answers[index] = value;
  if (index + 1 < answers.length) return { answers, index: index + 1, done: false };
  const open = answers.findIndex((a) => a === null);
  if (open === -1) return { answers, index, done: true };
  return { answers, index: open, done: false };
}

export function answeredCount<T>(progress: QuizProgress<T>): number {
  return progress.answers.filter((a) => a !== null).length;
}
