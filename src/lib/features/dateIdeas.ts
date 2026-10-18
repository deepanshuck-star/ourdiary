// Date-idea board logic. Import-free so `node --test` can load it directly.

export type DateIdeaCategory = 'cozy' | 'adventurous' | 'cheap' | 'fancy' | 'at-home';
export type VoterId = 'user_1' | 'user_2';
export type BucketCategoryHint = 'Travel' | 'Food' | 'Movies' | 'Activities' | 'Milestones';

export interface DateIdea {
  id: string;
  title: string;
  description: string;
  category: DateIdeaCategory;
  bucket: BucketCategoryHint;
  custom?: boolean;
  createdBy?: VoterId;
}

export type IdeaVotes = Record<string, { user_1?: boolean; user_2?: boolean }>;

export const DATE_IDEA_CATEGORIES: { id: DateIdeaCategory; label: string }[] = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'adventurous', label: 'Adventurous' },
  { id: 'cheap', label: 'Cheap & cheerful' },
  { id: 'fancy', label: 'Fancy' },
  { id: 'at-home', label: 'At home' },
];

export const CURATED_IDEAS: DateIdea[] = [
  { id: 'c01', category: 'cozy', bucket: 'Activities', title: 'Bookshop crawl', description: 'Wander three bookshops and pick a book for each other under a budget.' },
  { id: 'c02', category: 'cozy', bucket: 'Food', title: 'Rainy-day café hop', description: 'Find the coziest corner café and share one slow dessert.' },
  { id: 'c03', category: 'cozy', bucket: 'Activities', title: 'Sunrise blanket picnic', description: 'Thermos of chai, one blanket, and the first light of the day together.' },
  { id: 'c04', category: 'cozy', bucket: 'Movies', title: 'Old-film night out', description: 'Catch a classic at a small cinema, then talk about it over a late snack.' },
  { id: 'c05', category: 'cozy', bucket: 'Activities', title: 'Pottery for two', description: 'Get your hands muddy at a beginner wheel class and keep the wonky results.' },
  { id: 'c06', category: 'cozy', bucket: 'Activities', title: 'Stargazing drive', description: 'Drive away from the city lights and name your own constellations.' },
  { id: 'a01', category: 'adventurous', bucket: 'Travel', title: 'Spontaneous day trip', description: 'Pick a town within three hours, go without a plan, follow your noses.' },
  { id: 'a02', category: 'adventurous', bucket: 'Activities', title: 'Sunrise trek', description: 'Start in the dark, reach the top as the sky turns pink.' },
  { id: 'a03', category: 'adventurous', bucket: 'Activities', title: 'Kayaking afternoon', description: 'Paddle in sync, or at least try to, and laugh when you do not.' },
  { id: 'a04', category: 'adventurous', bucket: 'Activities', title: 'Rock-climbing gym', description: 'Belay each other and cheer every small win on the wall.' },
  { id: 'a05', category: 'adventurous', bucket: 'Food', title: 'Street-food challenge', description: 'Try five dishes neither of you has ever eaten.' },
  { id: 'a06', category: 'adventurous', bucket: 'Travel', title: 'Night-train escape', description: 'Book a sleeper berth and wake up somewhere new.' },
  { id: 'h01', category: 'cheap', bucket: 'Activities', title: 'Sunset walk and street snacks', description: 'Find a new viewpoint and split whatever smells best on the way.' },
  { id: 'h02', category: 'cheap', bucket: 'Activities', title: 'Free museum day', description: 'Each of you picks one piece and explains why it speaks to you.' },
  { id: 'h03', category: 'cheap', bucket: 'Activities', title: 'Thrift-store outfit swap', description: 'Small budget, pick an outfit for each other, wear it to dinner.' },
  { id: 'h04', category: 'cheap', bucket: 'Activities', title: 'Park picnic with a twist', description: 'Every dish has to start with the same letter.' },
  { id: 'h05', category: 'cheap', bucket: 'Activities', title: 'Library date', description: 'Pick a stack of books for each other and read side by side.' },
  { id: 'h06', category: 'cheap', bucket: 'Activities', title: 'Photo walk', description: 'One phone, one theme, twenty photos. Compare favourites after.' },
  { id: 'f01', category: 'fancy', bucket: 'Food', title: 'Chef’s tasting menu', description: 'Dress up and let the kitchen surprise you course after course.' },
  { id: 'f02', category: 'fancy', bucket: 'Activities', title: 'Rooftop cocktails', description: 'Golden-hour drinks somewhere with a view of the whole city.' },
  { id: 'f03', category: 'fancy', bucket: 'Activities', title: 'Live orchestra night', description: 'Let the music do the talking for an evening.' },
  { id: 'f04', category: 'fancy', bucket: 'Travel', title: 'Weekend staycation', description: 'Book a beautiful hotel in your own city and act like tourists.' },
  { id: 'f05', category: 'fancy', bucket: 'Activities', title: 'Couples spa afternoon', description: 'Phones off, robes on, nothing to do but unwind.' },
  { id: 'f06', category: 'fancy', bucket: 'Food', title: 'Wine or tea tasting', description: 'Learn the notes, pick a favourite, take a bottle or tin home.' },
  { id: 'm01', category: 'at-home', bucket: 'Food', title: 'Cook a cuisine you have never tried', description: 'Pick a country at random and recreate a full dinner.' },
  { id: 'm02', category: 'at-home', bucket: 'Movies', title: 'Blanket-fort movie marathon', description: 'Build the fort first. The movies are secondary.' },
  { id: 'm03', category: 'at-home', bucket: 'Activities', title: 'Paint each other', description: 'Portraits, no skill required. Frame the funniest one.' },
  { id: 'm04', category: 'at-home', bucket: 'Activities', title: '36 questions night', description: 'Candles on, take turns with the questions that make people fall in love.' },
  { id: 'm05', category: 'at-home', bucket: 'Activities', title: 'Living-room dance class', description: 'Follow a salsa tutorial and step on each other’s toes.' },
  { id: 'm06', category: 'at-home', bucket: 'Milestones', title: 'Time-capsule letters', description: 'Write to your future selves and seal them for a year.' },
];

export function categoryToBucket(category: DateIdeaCategory): BucketCategoryHint {
  if (category === 'fancy') return 'Food';
  return 'Activities';
}

export function makeCustomIdea(
  id: string,
  title: string,
  category: DateIdeaCategory,
  description: string,
  createdBy: VoterId
): DateIdea {
  return {
    id,
    title: title.trim(),
    description: description.trim(),
    category,
    bucket: categoryToBucket(category),
    custom: true,
    createdBy,
  };
}

export function recordVote(votes: IdeaVotes, ideaId: string, voter: VoterId, yes: boolean): IdeaVotes {
  return { ...votes, [ideaId]: { ...votes[ideaId], [voter]: yes } };
}

export function clearVote(votes: IdeaVotes, ideaId: string, voter: VoterId): IdeaVotes {
  const current = { ...votes[ideaId] };
  delete current[voter];
  return { ...votes, [ideaId]: current };
}

/** Ideas this voter has not yet swiped on, in deck order. */
export function remainingFor(ideas: DateIdea[], votes: IdeaVotes, voter: VoterId): DateIdea[] {
  return ideas.filter((idea) => votes[idea.id]?.[voter] === undefined);
}

/** Ideas both partners said yes to. */
export function getMatches(ideas: DateIdea[], votes: IdeaVotes): DateIdea[] {
  return ideas.filter((idea) => votes[idea.id]?.user_1 === true && votes[idea.id]?.user_2 === true);
}

/** Ideas this voter liked that the partner has not swiped on yet. */
export function waitingOnPartner(ideas: DateIdea[], votes: IdeaVotes, voter: VoterId): DateIdea[] {
  const partner: VoterId = voter === 'user_1' ? 'user_2' : 'user_1';
  return ideas.filter(
    (idea) => votes[idea.id]?.[voter] === true && votes[idea.id]?.[partner] === undefined
  );
}

export function filterByCategory(ideas: DateIdea[], category: DateIdeaCategory | 'all'): DateIdea[] {
  return category === 'all' ? ideas : ideas.filter((idea) => idea.category === category);
}
