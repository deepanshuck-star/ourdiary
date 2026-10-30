// What each place in the world holds. Import-free and tested.
//
// Every item here is real: a memory you saved, a message one of you sent,
// a dream on your list. The scenes are only ever a view onto these, and
// each place lists the same items in plain text below its scene so nothing
// is reachable only by tapping a moving boat.

export interface PlaceMemory {
  id: string;
  title: string;
  date: string;
  photoCount: number;
}

export interface Keepsake {
  id: string;
  title: string;
  date: string;
  /** Which hanging spot in the forest it takes. */
  slot: number;
  /** A polaroid if the memory has a photo, otherwise a leaf. */
  form: 'polaroid' | 'leaf';
}

/** The forest has this many places to hang a keepsake in view. */
export const FOREST_SLOTS = 12;

/**
 * The most recent memories, one per slot, newest in the nearest trees.
 * Older memories are not lost — they are in the list below the scene.
 */
export function forestKeepsakes(memories: PlaceMemory[], max = FOREST_SLOTS): Keepsake[] {
  return memories
    .slice()
    .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date)))
    .slice(0, Math.max(0, Math.min(max, FOREST_SLOTS)))
    .map((m, i) => ({ id: m.id, title: m.title, date: m.date, slot: i, form: m.photoCount > 0 ? 'polaroid' : 'leaf' }));
}

export interface PlaceMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Boat {
  id: string;
  /** Who wrote it — attributed to the real author, never to "the world". */
  from: 'me' | 'partner';
  text: string;
  createdAt: string;
  lane: number;
}

export const RIVER_BOATS = 6;

export function riverBoats(messages: PlaceMessage[], myId: string, max = RIVER_BOATS): Boat[] {
  return messages
    .filter((m) => m.content && m.content.trim())
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-Math.max(0, Math.min(max, RIVER_BOATS)))
    .map((m, i) => ({
      id: m.id,
      from: m.senderId === myId ? 'me' : 'partner',
      text: m.content.trim(),
      createdAt: m.createdAt,
      lane: i % 3,
    }));
}

export interface PlaceDream {
  id: string;
  title: string;
  completed: boolean;
}

export interface TrailMarker {
  id: string;
  title: string;
  reached: boolean;
  /** 0 at the foot of the trail, rising toward the summit. */
  step: number;
}

export const TRAIL_STEPS = 12;

/**
 * Dreams along the mountain trail: the ones you reached lower down, behind
 * you, and the ones ahead climbing toward the peak.
 */
export function trailMarkers(dreams: PlaceDream[], max = TRAIL_STEPS): TrailMarker[] {
  const reached = dreams.filter((d) => d.completed);
  const ahead = dreams.filter((d) => !d.completed);
  return [...reached, ...ahead]
    .slice(0, Math.max(0, Math.min(max, TRAIL_STEPS)))
    .map((d, i) => ({ id: d.id, title: d.title, reached: d.completed, step: i }));
}

/** Days until the next anniversary of a YYYY-MM-DD date, counting today as 0. */
export function daysUntilNextAnniversary(anniversaryIso: string, todayIso: string): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anniversaryIso);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayIso);
  if (!a || !t) return null;
  const today = Date.UTC(+t[1], +t[2] - 1, +t[3]);
  let next = Date.UTC(+t[1], +a[2] - 1, +a[3]);
  if (next < today) next = Date.UTC(+t[1] + 1, +a[2] - 1, +a[3]);
  return Math.round((next - today) / 86_400_000);
}
