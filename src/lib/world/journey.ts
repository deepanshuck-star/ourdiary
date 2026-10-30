// The train journey through the world: which stations it stops at, in what
// order, and what landscape it passes through on the way to each.
//
// Built only from the couple's real history — the day it began, memories
// they saved, reactions they left, dreams still ahead. Import-free apart
// from nothing at all, so it loads under node --test.

export type Scenery = 'fields' | 'village' | 'forest' | 'river' | 'hills' | 'mountains' | 'sunset';
export type StationKind = 'begin' | 'first-date' | 'anniversary' | 'loved' | 'memory' | 'today' | 'dreams';

export interface Station {
  id: string;
  kind: StationKind;
  label: string;
  /** YYYY-MM-DD, or null for the dreams still ahead. */
  date: string | null;
  href: string;
  scenery: Scenery;
  memoryId?: string;
}

export interface JourneyMemory {
  id: string;
  title: string;
  date: string;
  category: string;
  reactions?: unknown[];
}

// The landscape between stations, in the order the brief describes the
// ride: fields, a village, a forest, a river with its bridge, hills,
// mountains, and the sunset at the end.
export const SCENERY_ORDER: Scenery[] = ['fields', 'village', 'forest', 'river', 'hills', 'mountains'];

/** Memory stations are capped so the ride stays a ride, not a ledger. */
export const MAX_MEMORY_STATIONS = 10;

// A disagreement is part of a real relationship and stays in Memories, but
// it is not a stop on a journey the couple ride for the view.
const NOT_A_STATION = new Set(['Fight or disagreement']);

export function buildStations(input: {
  startDate: string;
  memories: JourneyMemory[];
  openDreams: number;
  todayIso: string;
}): Station[] {
  const past = input.memories
    .filter((m) => m.date && m.date <= input.todayIso && !NOT_A_STATION.has(m.category))
    .slice()
    .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));

  const firstDate = past.find((m) => m.category === 'First date');
  // "Most loved" means the most reactions the two of you actually left —
  // a real signal, rather than one the app invents.
  let loved: JourneyMemory | undefined;
  for (const m of past) {
    const count = Array.isArray(m.reactions) ? m.reactions.length : 0;
    const best = loved && Array.isArray(loved.reactions) ? loved.reactions.length : 0;
    if (count > 0 && count > best) loved = m;
  }

  const kindOf = (m: JourneyMemory): StationKind =>
    m === firstDate ? 'first-date' : m.category === 'Anniversary' ? 'anniversary' : m === loved ? 'loved' : 'memory';

  // Keep every milestone, then fill with the most recent ordinary memories.
  const milestones = past.filter((m) => kindOf(m) !== 'memory');
  const ordinary = past.filter((m) => kindOf(m) === 'memory');
  const room = Math.max(0, MAX_MEMORY_STATIONS - milestones.length);
  const chosen = [...milestones, ...ordinary.slice(Math.max(0, ordinary.length - room))]
    .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))
    .slice(-MAX_MEMORY_STATIONS);

  const stations: Station[] = [
    { id: 'begin', kind: 'begin', label: 'Where it began', date: input.startDate || null, href: '/memories', scenery: 'fields' },
  ];
  chosen.forEach((m, i) => {
    const kind = kindOf(m);
    const label =
      kind === 'first-date' ? `First date · ${m.title}` : kind === 'loved' ? `Most loved · ${m.title}` : m.title;
    stations.push({
      id: `memory-${m.id}`,
      kind,
      label,
      date: m.date,
      href: `/memories/${encodeURIComponent(m.id)}`,
      scenery: SCENERY_ORDER[(i + 1) % SCENERY_ORDER.length],
      memoryId: m.id,
    });
  });
  stations.push({ id: 'today', kind: 'today', label: 'Today', date: input.todayIso, href: '/dashboard', scenery: 'sunset' });
  if (input.openDreams > 0) {
    stations.push({
      id: 'dreams',
      kind: 'dreams',
      label: input.openDreams === 1 ? 'A dream ahead' : `${input.openDreams} dreams ahead`,
      date: null,
      href: '/world/mountains',
      scenery: 'mountains',
    });
  }
  return stations;
}
