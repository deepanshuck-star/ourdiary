// What the app is, depending on who is in the diary.
// Import-free so `node --test` can load it directly — see tests/space-mode.test.mjs.
//
// Two different questions get confused easily, so they are kept apart here:
//
//   kind       — what this diary IS. 'personal' means one person, on purpose.
//                A couple feature there is not locked, it is absent: there is
//                no second person coming, so a greyed-out row with "invite
//                your partner" on it would be noise forever.
//
//   hasPartner — whether a COUPLE diary has filled its second seat yet. Here
//                the features are coming, so they are shown waiting rather
//                than hidden, and they light up when someone joins.
//
// Same route, three possible answers. That distinction is the whole file.

export type SpaceKind = 'personal' | 'couple';

export interface SpaceContext {
  kind: SpaceKind;
  hasPartner: boolean;
  /** True while we're still reading membership; nothing is hidden or locked yet. */
  loading?: boolean;
}

export type Access =
  /** Show it, unchanged. */
  | 'open'
  /** Show it, reworded or with its two-person parts removed. */
  | 'adapted'
  /** Not in a personal diary at all. */
  | 'hidden'
  /** A couple diary with one seat still empty: visible, inert, explained. */
  | 'waiting';

/**
 * Routes whose core action needs a second person to DO something — reply,
 * vote, answer, redeem, receive. Hidden in a personal diary; shown waiting
 * in a couple diary with nobody in it yet.
 */
export const COUPLE_ONLY: Record<string, string> = {
  '/chat': 'A thread needs someone on the other end.',
  '/long-distance': 'Two clocks, two cities — this one is built out of the gap between you.',
  '/quizzes': 'Someone has to answer so you can guess wrong.',
  '/coupons': 'A coupon is a promise to someone. Alone there is nobody to redeem it with.',
  '/care-packages': 'Something in the post needs a person at the other end of it.',
  '/gifts': 'The wardrobe records who gave what to whom.',
  '/date-ideas': 'Ideas get voted on. One vote is just a list.',
};

/**
 * Routes that keep working for one person once the two-person half is taken
 * out. The note is shown on the page so the difference is stated, not hidden.
 */
export const PERSONAL_ADAPTED: Record<string, string> = {
  '/surprises': 'Notes to your future self, unlocked by a date or a place.',
  '/letters': 'Letters to your future self, sealed until the date you choose.',
  '/daily-spark': 'A prompt a day, and everything you have answered so far.',
  '/photo-of-the-day': 'One frame a day, kept as a strip you can scroll back through.',
  '/trips': 'Your next trip, counted down. Costs are listed but not split.',
  '/budget': 'What you have spent, by month and category.',
  '/countdowns': 'Everything you are counting down to.',
  '/our-stats': 'Your entries, photos and streaks.',
  '/memory-book': 'Your story so far.',
  '/music': 'The songs that go with it.',
  '/bucket-list': 'Things you want to do.',
  '/memories': 'Everything worth keeping.',
};

/** Titles that say "our" and shouldn't, in a diary of one. */
export const PERSONAL_TITLES: Record<string, string> = {
  '/music': 'My Soundtrack',
  '/memories': 'My Memories',
  '/memory-book': 'My Memory Book',
  '/our-stats': 'My Stats',
  '/bucket-list': 'My Bucket List',
  '/budget': 'My Budget',
  '/games': 'Games',
};

/**
 * Dashboard widgets that ping, show or wait on another person. Hidden in a
 * personal diary; a couple diary keeps them and they simply stay quiet.
 */
export const COUPLE_ONLY_WIDGETS = [
  'MoodBeaconBanner',
  'HeartbeatLovePingModal',
  'IncomingHeartbeatAlert',
  'WarmHugModal',
  'PartnerPresence',
  'GoodMorningHandoff',
  'DistanceCounter',
  'MorningMail',
] as const;

export type CoupleOnlyWidget = (typeof COUPLE_ONLY_WIDGETS)[number];

export function widgetAccess(widget: string, ctx: SpaceContext): Access {
  const isCoupleOnly = (COUPLE_ONLY_WIDGETS as readonly string[]).includes(widget);
  if (!isCoupleOnly) return 'open';
  if (ctx.loading) return 'open';
  if (ctx.kind === 'personal') return 'hidden';
  return ctx.hasPartner ? 'open' : 'waiting';
}

/** What to do with one route in one diary. */
export function routeAccess(href: string, ctx: SpaceContext): Access {
  const path = normalize(href);

  // Never hide or lock anything on the strength of an answer we don't have
  // yet — a row that vanishes and comes back is worse than a slow row.
  if (ctx.loading) return 'open';

  if (Object.prototype.hasOwnProperty.call(COUPLE_ONLY, path)) {
    if (ctx.kind === 'personal') return 'hidden';
    return ctx.hasPartner ? 'open' : 'waiting';
  }

  if (ctx.kind === 'personal' && Object.prototype.hasOwnProperty.call(PERSONAL_ADAPTED, path)) {
    return 'adapted';
  }

  return 'open';
}

/** Why a route is hidden or waiting, for the copy that explains it. */
export function reasonFor(href: string): string | null {
  return COUPLE_ONLY[normalize(href)] ?? null;
}

/** The personal-diary subtitle for an adapted route. */
export function personalNote(href: string): string | null {
  return PERSONAL_ADAPTED[normalize(href)] ?? null;
}

/** The personal-diary title for a route that otherwise says "our". */
export function titleFor(href: string, ctx: SpaceContext, fallback: string): string {
  if (ctx.kind !== 'personal') return fallback;
  return PERSONAL_TITLES[normalize(href)] ?? fallback;
}

/**
 * Whether a game from the arcade registry belongs in this diary.
 *
 * It reads the registry's existing `requires` list rather than naming game
 * ids, so a new two-player game is handled by the flag it already has to
 * declare — there is no second list here to forget to update.
 */
export function gameAllowed(requires: readonly string[] | undefined, ctx: SpaceContext): boolean {
  if (ctx.kind !== 'personal') return true;
  return !(requires ?? []).includes('partner');
}

/** How many routes a couple diary is still waiting on. Zero in a personal one. */
export function waitingCount(ctx: SpaceContext): number {
  if (ctx.loading || ctx.kind === 'personal' || ctx.hasPartner) return 0;
  return Object.keys(COUPLE_ONLY).length;
}

export function isPersonal(ctx: SpaceContext): boolean {
  return ctx.kind === 'personal';
}

function normalize(href: string): string {
  const path = (href || '').split('?')[0].split('#')[0];
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}
