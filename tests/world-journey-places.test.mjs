import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStations, MAX_MEMORY_STATIONS } from '../src/lib/world/journey.ts';
import { forestKeepsakes, riverBoats, trailMarkers, daysUntilNextAnniversary, FOREST_SLOTS, RIVER_BOATS, TRAIL_STEPS } from '../src/lib/world/places.ts';

const mem = (id, date, category = 'Outing', reactions = []) => ({ id, title: `M ${id}`, date, category, reactions });

test('the journey always begins at the beginning and stops at today', () => {
  const st = buildStations({ startDate: '2023-04-01', memories: [], openDreams: 0, todayIso: '2026-10-30' });
  assert.deepEqual(st.map((s) => s.kind), ['begin', 'today']);
  assert.equal(st[0].date, '2023-04-01');
});

test('milestones are found from real data', () => {
  const memories = [
    mem('a', '2023-05-01', 'First date'),
    mem('b', '2024-04-01', 'Anniversary'),
    mem('c', '2024-08-01', 'Trip', [1, 2, 3]),
    mem('d', '2025-01-01', 'Outing', [1]),
  ];
  const st = buildStations({ startDate: '2023-04-01', memories, openDreams: 2, todayIso: '2026-10-30' });
  const kinds = Object.fromEntries(st.filter((s) => s.memoryId).map((s) => [s.memoryId, s.kind]));
  assert.equal(kinds.a, 'first-date');
  assert.equal(kinds.b, 'anniversary');
  assert.equal(kinds.c, 'loved', 'most reactions is "most loved"');
  assert.equal(kinds.d, 'memory');
  assert.equal(st.at(-1).kind, 'dreams');
  assert.equal(st.at(-1).label, '2 dreams ahead');
});

test('stops are in order, never in the future, and a fight is not a stop', () => {
  const memories = [mem('z', '2025-06-01'), mem('y', '2024-01-01'), mem('f', '2024-03-01', 'Fight or disagreement'), mem('x', '2030-01-01')];
  const st = buildStations({ startDate: '2023-01-01', memories, openDreams: 0, todayIso: '2026-10-30' });
  const ids = st.filter((s) => s.memoryId).map((s) => s.memoryId);
  assert.deepEqual(ids, ['y', 'z']);
  // Every link is a real place.
  for (const s of st) assert.match(s.href, /^\/[a-z/%0-9-]*$/i);
});

test('a long history is capped but keeps every milestone', () => {
  const memories = Array.from({ length: 40 }, (_, i) => mem(`m${String(i).padStart(2, '0')}`, `2024-01-${String((i % 28) + 1).padStart(2, '0')}`));
  memories.push(mem('fd', '2023-02-02', 'First date'));
  const st = buildStations({ startDate: '2023-01-01', memories, openDreams: 0, todayIso: '2026-10-30' });
  const memoryStops = st.filter((s) => s.memoryId);
  assert.equal(memoryStops.length, MAX_MEMORY_STATIONS);
  assert.ok(memoryStops.some((s) => s.kind === 'first-date'), 'the first date survived the cap');
});

test('the forest hangs the newest memories, in the form that fits them', () => {
  const ks = forestKeepsakes([
    { id: 'old', title: 'Old', date: '2023-01-01', photoCount: 0 },
    { id: 'new', title: 'New', date: '2026-01-01', photoCount: 2 },
  ]);
  assert.deepEqual(ks.map((k) => k.id), ['new', 'old']);
  assert.equal(ks[0].form, 'polaroid');
  assert.equal(ks[1].form, 'leaf');
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `${i}`, title: '', date: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`, photoCount: 0 }));
  assert.equal(forestKeepsakes(many).length, FOREST_SLOTS);
  assert.equal(new Set(forestKeepsakes(many).map((k) => k.slot)).size, FOREST_SLOTS, 'no two on one branch');
});

test('every boat is attributed to whoever really wrote it', () => {
  const msgs = [
    { id: '1', senderId: 'me', content: 'hello', createdAt: '2026-10-01T10:00:00Z' },
    { id: '2', senderId: 'them', content: 'hi back', createdAt: '2026-10-01T10:01:00Z' },
    { id: '3', senderId: 'them', content: '   ', createdAt: '2026-10-01T10:02:00Z' },
  ];
  const boats = riverBoats(msgs, 'me');
  assert.deepEqual(boats.map((b) => [b.id, b.from]), [['1', 'me'], ['2', 'partner']]);
  const flood = Array.from({ length: 20 }, (_, i) => ({ id: `${i}`, senderId: 'me', content: 'x', createdAt: `2026-10-01T10:${String(i).padStart(2, '0')}:00Z` }));
  const latest = riverBoats(flood, 'me');
  assert.equal(latest.length, RIVER_BOATS);
  assert.equal(latest.at(-1).id, '19', 'the newest message is on the water');
});

test('dreams you reached sit behind you on the trail', () => {
  const markers = trailMarkers([
    { id: 'a', title: 'A', completed: false },
    { id: 'b', title: 'B', completed: true },
  ]);
  assert.deepEqual(markers.map((m) => [m.id, m.step, m.reached]), [['b', 0, true], ['a', 1, false]]);
  assert.equal(trailMarkers(Array.from({ length: 40 }, (_, i) => ({ id: `${i}`, title: '', completed: false }))).length, TRAIL_STEPS);
});

test('the next anniversary counts today as zero and wraps the year', () => {
  assert.equal(daysUntilNextAnniversary('2023-10-30', '2026-10-30'), 0);
  assert.equal(daysUntilNextAnniversary('2023-10-31', '2026-10-30'), 1);
  assert.equal(daysUntilNextAnniversary('2023-10-29', '2026-10-30'), 364);
  assert.equal(daysUntilNextAnniversary('nope', '2026-10-30'), null);
});
