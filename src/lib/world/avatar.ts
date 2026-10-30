// The two little figures, and how each partner chooses theirs.
//
// Import-free so tests/world-avatar.test.mjs can load it directly.
//
// Inclusive by construction: six skin tones across the whole range, hair
// styles named for their shape rather than for a gender, and nothing about
// a figure is decided by which partner slot it belongs to except the
// default outfit colour, so neither partner is "the default one".
//
// Each partner edits only their own figure. The pet belongs to both.

export const SKIN_TONES = ['#F4D7BC', '#E6BD98', '#D09F78', '#AD7A55', '#875839', '#5C3B27'] as const;
export const HAIR_STYLES = ['short', 'bob', 'long', 'bun', 'curly', 'shaved'] as const;
export const HAIR_COLORS = ['#2A2420', '#5A3A28', '#8C4A2F', '#C9A15B', '#9A9590'] as const;
export const OUTFITS = ['#C46F57', '#357C78', '#56775C', '#D9A64E', '#7A5A7E', '#C98B98', '#6E9BB0', '#3E4652'] as const;
export const ACCESSORIES = ['none', 'glasses', 'scarf', 'flower', 'cap'] as const;
export const EXPRESSIONS = ['smile', 'calm', 'laugh', 'sleepy'] as const;
export const PETS = ['none', 'dog', 'cat'] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];
export type Accessory = (typeof ACCESSORIES)[number];
export type Expression = (typeof EXPRESSIONS)[number];
export type Pet = (typeof PETS)[number];
export type Slot = 'user_1' | 'user_2';

export interface Avatar {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  outfit: string;
  accessory: Accessory;
  expression: Expression;
  /** What the other one calls you in the world. Optional, short. */
  nickname: string;
}

export interface WorldAvatars {
  user_1: Avatar;
  user_2: Avatar;
  pet: Pet;
}

export const NICKNAME_MAX = 16;

export const HAIR_LABEL: Record<HairStyle, string> = {
  short: 'Short',
  bob: 'Bob',
  long: 'Long',
  bun: 'Bun',
  curly: 'Curly',
  shaved: 'Shaved',
};
export const ACCESSORY_LABEL: Record<Accessory, string> = {
  none: 'Nothing',
  glasses: 'Glasses',
  scarf: 'Scarf',
  flower: 'Flower',
  cap: 'Cap',
};
export const EXPRESSION_LABEL: Record<Expression, string> = {
  smile: 'Smile',
  calm: 'Calm',
  laugh: 'Laugh',
  sleepy: 'Sleepy',
};
export const PET_LABEL: Record<Pet, string> = { none: 'No pet', dog: 'A dog', cat: 'A cat' };

/**
 * Starting figures. Identical except the outfit, and the middle skin tone
 * rather than the lightest — the choice is the couple's, and the default
 * should not quietly suggest one.
 */
export function defaultAvatar(slot: Slot): Avatar {
  return {
    skin: SKIN_TONES[2],
    hair: 'short',
    hairColor: HAIR_COLORS[0],
    outfit: slot === 'user_1' ? OUTFITS[0] : OUTFITS[1],
    accessory: 'none',
    expression: 'smile',
    nickname: '',
  };
}

export const DEFAULT_WORLD_AVATARS: WorldAvatars = {
  user_1: defaultAvatar('user_1'),
  user_2: defaultAvatar('user_2'),
  pet: 'dog',
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Cleans a nickname: trimmed, single-spaced, capped, no markup characters. */
export function cleanNickname(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX);
}

/**
 * Anything in, a valid avatar out. The blob syncs between two devices, so it
 * can arrive from an older build or be half-written; a bad field falls back
 * to that slot's default rather than breaking the figure.
 */
export function parseAvatar(raw: unknown, slot: Slot): Avatar {
  const base = defaultAvatar(slot);
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    skin: pick(v.skin, SKIN_TONES, base.skin as (typeof SKIN_TONES)[number]),
    hair: pick(v.hair, HAIR_STYLES, base.hair),
    hairColor: pick(v.hairColor, HAIR_COLORS, base.hairColor as (typeof HAIR_COLORS)[number]),
    outfit: pick(v.outfit, OUTFITS, base.outfit as (typeof OUTFITS)[number]),
    accessory: pick(v.accessory, ACCESSORIES, base.accessory),
    expression: pick(v.expression, EXPRESSIONS, base.expression),
    nickname: cleanNickname(v.nickname),
  };
}

export function parseWorldAvatars(raw: unknown): WorldAvatars {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    user_1: parseAvatar(v.user_1, 'user_1'),
    user_2: parseAvatar(v.user_2, 'user_2'),
    pet: pick(v.pet, PETS, DEFAULT_WORLD_AVATARS.pet),
  };
}

/**
 * The only way a figure changes: one partner, their own slot. A device can
 * only ever write the slot it belongs to, so neither partner can dress the
 * other — the brief asks that both be equally represented, and that
 * includes being represented by your own choices.
 */
export function updateOwnAvatar(
  current: WorldAvatars,
  mySlot: Slot,
  changes: Partial<Avatar>
): WorldAvatars {
  const merged = parseAvatar({ ...current[mySlot], ...changes }, mySlot);
  return { ...current, [mySlot]: merged };
}

export function setPet(current: WorldAvatars, pet: Pet): WorldAvatars {
  return { ...current, pet: pick(pet, PETS, current.pet) };
}
