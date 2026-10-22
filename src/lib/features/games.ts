// Pure helpers and data for couple games arcade. No React, no network.

export type TicTacToeCell = 'user_1' | 'user_2' | null;

export const TIC_TAC_TOE_WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkTicTacToeWinner(board: TicTacToeCell[]): {
  winner: 'user_1' | 'user_2' | 'draw' | null;
  line: number[] | null;
} {
  for (const line of TIC_TAC_TOE_WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }

  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

export const COUPLE_STAKES = [
  'Loser gives winner a 10-minute head or shoulder massage 💆',
  'Winner picks what movie we watch next 🎬',
  'Loser makes tomorrow morning breakfast in bed 🥞',
  'Winner gets 20 uninterrupted kisses right now 💋',
  'Loser washes tonight’s dinner dishes 🍽️',
  'Winner gets treated to favorite coffee/dessert ☕🍰',
  'Loser has to give a 60-second warm bear hug 🤗',
  'Winner chooses our next weekend date spot 🎡',
];

// ----------------------------------------------------------- Truth or Dare ---

export type GameCategory = 'romantic' | 'playful' | 'intimate' | 'spicy';

export interface TruthOrDareItem {
  id: string;
  type: 'truth' | 'dare';
  category: GameCategory;
  text: string;
  durationSec?: number;
}

export const TRUTH_OR_DARE_PROMPTS: TruthOrDareItem[] = [
  // Romantic Truths
  { id: 'rt1', type: 'truth', category: 'romantic', text: 'What was the exact moment you realized you had fallen in love with me?' },
  { id: 'rt2', type: 'truth', category: 'romantic', text: 'What is your absolute favorite memory of us together so far?' },
  { id: 'rt3', type: 'truth', category: 'romantic', text: 'If we could relive one single day from our relationship, which day would you choose?' },
  { id: 'rt4', type: 'truth', category: 'romantic', text: 'What is one tiny habit of mine that secretly gives you butterflies?' },
  { id: 'rt5', type: 'truth', category: 'romantic', text: 'What song immediately makes you think of me whenever it plays?' },
  { id: 'rt6', type: 'truth', category: 'romantic', text: 'What was your very first impression of me the first time we ever met or talked?' },

  // Romantic Dares
  { id: 'rd1', type: 'dare', category: 'romantic', text: 'Look into my eyes for 60 seconds without speaking or laughing.', durationSec: 60 },
  { id: 'rd2', type: 'dare', category: 'romantic', text: 'Slow dance with me to our favorite song right here, right now.', durationSec: 90 },
  { id: 'rd3', type: 'dare', category: 'romantic', text: 'Give me three sincere compliments that you haven’t told me in a long time.' },
  { id: 'rd4', type: 'dare', category: 'romantic', text: 'Whisper your favorite thing about my smile directly into my ear.' },
  { id: 'rd5', type: 'dare', category: 'romantic', text: 'Kiss my forehead, then both cheeks, then my lips with extra tenderness.' },

  // Playful Truths
  { id: 'pt1', type: 'truth', category: 'playful', text: 'What is the funniest or most embarrassing thing you have ever witnessed me do?' },
  { id: 'pt2', type: 'truth', category: 'playful', text: 'If I were an animal, which one would I be and why?' },
  { id: 'pt3', type: 'truth', category: 'playful', text: 'What is one silly purchase you made that you tried to hide from me?' },
  { id: 'pt4', type: 'truth', category: 'playful', text: 'Who is the worse driver or navigator between the two of us? Be honest!' },
  { id: 'pt5', type: 'truth', category: 'playful', text: 'What fictional couple do we remind you of the most?' },

  // Playful Dares
  { id: 'pd1', type: 'dare', category: 'playful', text: 'Do your best dramatic impression of me when I get hungry or tired.', durationSec: 30 },
  { id: 'pd2', type: 'dare', category: 'playful', text: 'Let me style your hair however I want for the rest of this game.' },
  { id: 'pd3', type: 'dare', category: 'playful', text: 'Speak in a fancy royal accent for the next 3 rounds.', durationSec: 60 },
  { id: 'pd4', type: 'dare', category: 'playful', text: 'Show me the single most unflattering photo currently sitting on your phone camera roll.' },
  { id: 'pd5', type: 'dare', category: 'playful', text: 'Feed me a bite of food or a sip of a drink with your eyes closed.' },

  // Intimate Truths
  { id: 'it1', type: 'truth', category: 'intimate', text: 'What is something you feel deeply grateful for in how we support each other?' },
  { id: 'it2', type: 'truth', category: 'intimate', text: 'When do you feel most safe, seen, and comfortable around me?' },
  { id: 'it3', type: 'truth', category: 'intimate', text: 'What is a dream or secret goal you haven’t shared with anyone else yet?' },
  { id: 'it4', type: 'truth', category: 'intimate', text: 'How do you think we have both grown since we first got together?' },

  // Intimate Dares
  { id: 'id1', type: 'dare', category: 'intimate', text: 'Hold my hands and tell me one promise you want to make for our future.' },
  { id: 'id2', type: 'dare', category: 'intimate', text: 'Give me a relaxing 2-minute hand massage with gentle lotion.', durationSec: 120 },
  { id: 'id3', type: 'dare', category: 'intimate', text: 'Write a two-sentence love message on my palm using just your fingertip for me to guess.' },

  // Spicy Truths
  { id: 'st1', type: 'truth', category: 'spicy', text: 'What outfit or look of mine drives you completely crazy in the best way?' },
  { id: 'st2', type: 'truth', category: 'spicy', text: 'Where is your favorite place on your body to be kissed or caressed?' },
  { id: 'st3', type: 'truth', category: 'spicy', text: 'What is a romantic fantasy you would love for us to try together?' },

  // Spicy Dares
  { id: 'sd1', type: 'dare', category: 'spicy', text: 'Give me a 10-second passionate kiss like we are in the finale of a movie.', durationSec: 10 },
  { id: 'sd2', type: 'dare', category: 'spicy', text: 'Trace your lips slowly along my neck and collarbone.', durationSec: 20 },
  { id: 'sd3', type: 'dare', category: 'spicy', text: 'Whisper your secret craving or naughtiest thought into my ear right now.' },
];

export function getRandomPrompt(
  category: GameCategory | 'all',
  type: 'truth' | 'dare' | 'any',
  excludeIds: string[] = []
): TruthOrDareItem {
  const pool = TRUTH_OR_DARE_PROMPTS.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (type !== 'any' && p.type !== type) return false;
    return !excludeIds.includes(p.id);
  });

  const finalPool = pool.length > 0 ? pool : TRUTH_OR_DARE_PROMPTS;
  const index = Math.floor(Math.random() * finalPool.length);
  return finalPool[index];
}

// ---------------------------------------------------- Would You Rather & NHIE ---

export interface WouldYouRatherItem {
  id: string;
  optionA: string;
  optionB: string;
}

export const WOULD_YOU_RATHER_ITEMS: WouldYouRatherItem[] = [
  { id: 'wyr1', optionA: 'Live together in a cozy rainy mountain cabin', optionB: 'Live together in a sunny beach cottage by the ocean' },
  { id: 'wyr2', optionA: 'Take an impromptu weekend road trip with zero plans', optionB: 'Stay in bed all weekend with endless takeout and movies' },
  { id: 'wyr3', optionA: 'Cook an elaborate 4-course dinner together', optionB: 'Dress up fancy and go out to a romantic candlelight restaurant' },
  { id: 'wyr4', optionA: 'Wake up early together for a golden sunrise', optionB: 'Stay up until 3 AM stargazing and having deep talks' },
  { id: 'wyr5', optionA: 'Travel back in time to meet our younger selves', optionB: 'Flash forward 30 years to see our happy future lives' },
  { id: 'wyr6', optionA: 'Relive our very first date exactly as it happened', optionB: 'Plan the most lavish dream date anywhere in the world' },
  { id: 'wyr7', optionA: 'Read each other’s minds for just one hour', optionB: 'Have a magical pause button to freeze time together' },
  { id: 'wyr8', optionA: 'Give up Netflix/streaming together for a year', optionB: 'Give up dining out/takeout together for a year' },
  { id: 'wyr9', optionA: 'Always have matching couples pajamas', optionB: 'Always have secret inside jokes nobody else gets' },
  { id: 'wyr10', optionA: 'Adopt two playful golden retriever puppies', optionB: 'Adopt two adorable fluffy cuddle cats' },
];

export interface NeverHaveIEverItem {
  id: string;
  statement: string;
}

export const NEVER_HAVE_I_EVER_ITEMS: NeverHaveIEverItem[] = [
  { id: 'nhie1', statement: 'Never have I ever stalked your old photos before we officially started dating.' },
  { id: 'nhie2', statement: 'Never have I ever pretended to like a song or movie just because you loved it.' },
  { id: 'nhie3', statement: 'Never have I ever secretly taken a cute photo of you while you were sleeping.' },
  { id: 'nhie4', statement: 'Never have I ever rehearsed what I was going to text or say to you before sending it.' },
  { id: 'nhie5', statement: 'Never have I ever gotten jealous over something silly and tried not to show it.' },
  { id: 'nhie6', statement: 'Never have I ever eaten food you saved in the fridge and pretended I had no idea.' },
  { id: 'nhie7', statement: 'Never have I ever bragged about how amazing you are to my friends or family.' },
  { id: 'nhie8', statement: 'Never have I ever searched for our astrological zodiac compatibility online.' },
  { id: 'nhie9', statement: 'Never have I ever looked at you across a crowded room and thought "damn, I am so lucky".' },
  { id: 'nhie10', statement: 'Never have I ever daydreamed about what our future home or wedding would look like.' },
];

// -------------------------------------------------------- Photo Memory Match ---

export interface MemoryMatchCard {
  id: string;
  pairId: string;
  content: string; // Emoji or image URL
  isImage: boolean;
}

export const DEFAULT_ROMANTIC_ICONS = ['💌', '🌹', '💍', '🎁', '🧸', '🍷', '✈️', '🎵'];

export function createMemoryDeck(photoUrls: string[] = []): MemoryMatchCard[] {
  // Use valid photo URLs first, then backfill with romantic icons up to 8 pairs (16 cards total)
  const validPhotos = (photoUrls || []).filter((u) => typeof u === 'string' && u.length > 5);
  const photoItems = validPhotos.slice(0, 8).map((url, i) => ({ pairId: `photo_${i}`, content: url, isImage: true }));
  const neededIcons = 8 - photoItems.length;
  const iconItems = DEFAULT_ROMANTIC_ICONS.slice(0, neededIcons).map((icon, i) => ({ pairId: `icon_${i}`, content: icon, isImage: false }));
  const chosen = [...photoItems, ...iconItems];

  const cards: MemoryMatchCard[] = [];
  chosen.forEach((item, index) => {
    cards.push({ id: `c_${index}_a`, pairId: item.pairId, content: item.content, isImage: item.isImage });
    cards.push({ id: `c_${index}_b`, pairId: item.pairId, content: item.content, isImage: item.isImage });
  });

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

// --------------------------------------------------------------- Love Wordle ---

export const LOVE_WORDS = [
  'HEART',
  'SWEET',
  'CRUSH',
  'SMILE',
  'LOVER',
  'CHARM',
  'ANGEL',
  'ADORE',
  'BLISS',
  'MAGIC',
  'PEACE',
  'FLAME',
  'HONEY',
  'DANCE',
  'TRUST',
  'DREAM',
  'TOUCH',
  'WARM',
  'HAPPY',
  'GRACE',
  'KISSY',
  'ROSES',
  'CANDY',
  'FAVOR',
  'BLOOM',
  'LIGHT',
  'SHINE',
  'LUCKY',
  'SPARK',
];

export type WordleLetterState = 'correct' | 'present' | 'absent';

export function evaluateWordleGuess(guess: string, target: string): WordleLetterState[] {
  const g = guess.toUpperCase();
  const t = target.toUpperCase();
  const len = 5;
  const result: WordleLetterState[] = new Array(len).fill('absent');
  const targetLetterCounts: Record<string, number> = {};

  // Count target letters
  for (let i = 0; i < len; i++) {
    const letter = t[i];
    targetLetterCounts[letter] = (targetLetterCounts[letter] || 0) + 1;
  }

  // First pass: mark correct positions
  for (let i = 0; i < len; i++) {
    if (g[i] === t[i]) {
      result[i] = 'correct';
      targetLetterCounts[g[i]]--;
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < len; i++) {
    if (result[i] !== 'correct') {
      const letter = g[i];
      if (targetLetterCounts[letter] && targetLetterCounts[letter] > 0) {
        result[i] = 'present';
        targetLetterCounts[letter]--;
      }
    }
  }

  return result;
}

export function getWordOfTheDay(seedDate: Date = new Date()): string {
  const start = new Date(2026, 0, 1).getTime();
  const diffDays = Math.floor((seedDate.getTime() - start) / (1000 * 60 * 60 * 24));
  const index = Math.abs(diffDays) % LOVE_WORDS.length;
  return LOVE_WORDS[index];
}
