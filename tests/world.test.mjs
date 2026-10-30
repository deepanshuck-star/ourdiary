import test from 'node:test';
import assert from 'node:assert/strict';
import {
  phaseForHour,
  seasonForMonth,
  resolvePhase,
  resolveSeason,
  hashSeed,
  seededRandom,
  scatter,
  lifeFor,
  greetingFor,
  lettersWaiting,
  dreamFlags,
  memorySaplings,
  PHASE_LIGHT,
  SEASON_FOLIAGE,
  WORLD_PLACES,
  DAY_PHASES,
  WEATHERS,
  SEASONS,
} from '../src/lib/world/world.ts';

test('every hour of the day maps to a phase, including the awkward ones', () => {
  assert.equal(phaseForHour(5), 'morning');
  assert.equal(phaseForHour(10), 'morning');
  assert.equal(phaseForHour(11), 'afternoon');
  assert.equal(phaseForHour(17), 'evening');
  assert.equal(phaseForHour(20), 'night');
  assert.equal(phaseForHour(0), 'night');
  assert.equal(phaseForHour(4), 'night');
  // Out-of-range input wraps rather than falling through to undefined.
  assert.equal(phaseForHour(24), 'night');
  assert.equal(phaseForHour(-1), 'night');
  assert.equal(phaseForHour(29), 'morning');
});

test('seasons follow the calendar and flip for the southern hemisphere', () => {
  assert.equal(seasonForMonth(0), 'winter');
  assert.equal(seasonForMonth(3), 'spring');
  assert.equal(seasonForMonth(6), 'summer');
  assert.equal(seasonForMonth(9), 'autumn');
  assert.equal(seasonForMonth(11), 'winter');
  // A couple in Melbourne should not get snow in July's opposite.
  assert.equal(seasonForMonth(0, 'south'), 'summer');
  assert.equal(seasonForMonth(6, 'south'), 'winter');
});

test('a manual choice always beats the clock', () => {
  // Partners in different timezones need to be able to sit in the same light.
  assert.equal(resolvePhase('auto', 9), 'morning');
  assert.equal(resolvePhase('night', 9), 'night');
  assert.equal(resolveSeason('auto', 6), 'summer');
  assert.equal(resolveSeason('winter', 6), 'winter');
});

test('seeded randomness is stable, so the scene does not reshuffle under you', () => {
  const a = seededRandom(hashSeed('couple-1:2026-10-30'));
  const b = seededRandom(hashSeed('couple-1:2026-10-30'));
  for (let i = 0; i < 20; i += 1) assert.equal(a(), b());
  // A different day is a different arrangement.
  assert.notEqual(
    seededRandom(hashSeed('couple-1:2026-10-30'))(),
    seededRandom(hashSeed('couple-1:2026-10-31'))()
  );
  // And it stays inside [0, 1).
  const r = seededRandom(42);
  for (let i = 0; i < 500; i += 1) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
});

test('scattered creatures stay in their box and never move in formation', () => {
  const box = { x: 100, y: 50, w: 300, h: 120 };
  const points = scatter(7, 12, box, { min: 6, max: 14 });
  assert.equal(points.length, 12);
  for (const p of points) {
    assert.ok(p.x >= box.x && p.x <= box.x + box.w, `x ${p.x} escaped`);
    assert.ok(p.y >= box.y && p.y <= box.y + box.h, `y ${p.y} escaped`);
    assert.ok(p.duration >= 6 && p.duration <= 14);
    // Negative delays start each loop mid-flight.
    assert.ok(p.delay <= 0 && p.delay >= -p.duration);
  }
  // "Bounded random" means varied: no two share a clock.
  assert.equal(new Set(points.map((p) => p.duration)).size > 8, true);
});

test('nothing appears out of its hour or its weather', () => {
  const noonRain = lifeFor('afternoon', 'summer', 'rain');
  assert.equal(noonRain.butterflies, 0, 'butterflies in the rain');
  assert.equal(noonRain.birds, 0, 'birds in the rain');
  assert.equal(noonRain.sun, false);

  const noon = lifeFor('afternoon', 'summer', 'clear');
  assert.equal(noon.fireflies, 0, 'fireflies at noon');
  assert.equal(noon.stars, false);
  assert.ok(noon.butterflies > 0);

  const night = lifeFor('night', 'summer', 'clear');
  assert.equal(night.sun, false);
  assert.equal(night.moon, true);
  assert.equal(night.stars, true);
  assert.ok(night.fireflies > 0);
  assert.equal(night.windowLights, true);

  // Clouds hide the stars; the moon can still glow through.
  assert.equal(lifeFor('night', 'summer', 'cloudy').stars, false);

  const winter = lifeFor('afternoon', 'winter', 'clear');
  assert.equal(winter.butterflies, 0);
  assert.equal(winter.snowOnRoofs, true);
  assert.equal(winter.chimneySmoke, 1);

  assert.equal(lifeFor('afternoon', 'autumn', 'clear').fallingLeaves, true);
  assert.equal(lifeFor('afternoon', 'autumn', 'rain').fallingLeaves, false);
});

test('every combination produces a complete, finite scene', () => {
  for (const phase of DAY_PHASES) {
    for (const season of SEASONS) {
      for (const weather of WEATHERS) {
        const life = lifeFor(phase, season, weather);
        for (const [key, value] of Object.entries(life)) {
          assert.ok(value !== undefined, `${phase}/${season}/${weather}: ${key}`);
          if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0);
        }
        // Particle budgets stay small — the brief bans expensive systems.
        assert.ok(life.birds + life.butterflies + life.fireflies <= 12);
      }
    }
  }
});

test('the palette is fully specified', () => {
  for (const phase of DAY_PHASES) {
    const l = PHASE_LIGHT[phase];
    for (const c of [l.skyTop, l.skyBottom, l.tint]) assert.match(c, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(l.tintOpacity >= 0 && l.tintOpacity <= 0.6, 'night must not swallow the scene');
  }
  for (const season of SEASONS) {
    for (const c of Object.values(SEASON_FOLIAGE[season])) assert.match(c, /^#[0-9A-Fa-f]{6}$/);
  }
});

test('greetings are about the world, never about what the partner did', () => {
  for (const phase of DAY_PHASES) {
    for (const weather of WEATHERS) {
      for (let seed = 0; seed < 6; seed += 1) {
        const g = greetingFor('Maya', phase, weather, seed);
        assert.ok(g.title.includes('Maya'));
        assert.ok(g.line.length > 10);
        // The brief: never fabricate partner actions or feelings.
        assert.equal(/thinking of you|misses you|sent you|is waiting|loves you/i.test(g.line), false, g.line);
      }
    }
  }
  assert.equal(greetingFor('', 'morning', 'clear', 0).title, 'Good morning ♡');
  // Weather wins over the rotating line, so a rainy day says it is raining.
  assert.match(greetingFor('Maya', 'morning', 'rain', 0).line, /Baarish/);
});

test('the mailbox only shows letters that are really there for you', () => {
  const today = '2026-10-30';
  const letters = [
    { toId: 'user_1', unlockDate: '2026-10-01', isDraft: false }, // waiting
    { toId: 'user_1', unlockDate: '2026-10-01', isDraft: false, readAt: '2026-10-02' }, // read
    { toId: 'user_1', unlockDate: '2026-12-25', isDraft: false }, // still sealed
    { toId: 'user_1', unlockDate: '2026-10-01', isDraft: true }, // partner's draft
    { toId: 'user_2', unlockDate: '2026-10-01', isDraft: false }, // for the other person
    { toId: 'user_1', unlockDate: today, isDraft: false }, // opens today: counts
  ];
  assert.equal(lettersWaiting(letters, 'user_1', today), 2);
  assert.equal(lettersWaiting([], 'user_1', today), 0);
});

test('the world grows with the couple and never shrinks for being quiet', () => {
  assert.equal(memorySaplings(0), 0);
  assert.equal(memorySaplings(3), 3);
  assert.equal(memorySaplings(400), 6, 'capped, so a long history does not become a forest');
  assert.equal(memorySaplings(-2), 0);
  assert.equal(dreamFlags([]), 0);
  assert.equal(dreamFlags([{ completed: true }, { completed: false }, { completed: true }]), 2);
  assert.equal(dreamFlags(Array.from({ length: 30 }, () => ({ completed: true }))), 5);
});

test('every place in the world goes somewhere real', () => {
  const ids = new Set();
  for (const place of WORLD_PLACES) {
    assert.ok(!ids.has(place.id), `duplicate ${place.id}`);
    ids.add(place.id);
    assert.match(place.href, /^\/[a-z-]+$/);
    assert.ok(place.label && place.description);
  }
});
