import test from 'node:test';
import assert from 'node:assert/strict';
import {
  latLngToGlobeAngles,
  normalizeAngle,
  nearestEquivalentAngle,
  dampTowards,
  clampTheta,
  cssColorToRgb01,
  TAU,
} from '../src/lib/features/globe-math.ts';
import {
  locationKey,
  pendingLocationKeys,
  buildNominatimUrl,
  parseNominatimResponse,
  msUntilNextRequest,
  geocodeProgress,
  GEOCODE_MIN_INTERVAL_MS,
} from '../src/lib/features/geocode-queue.ts';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('latLngToGlobeAngles matches the cobe focus formula', () => {
  const { phi, theta } = latLngToGlobeAngles(0, 0);
  close(phi, (3 * Math.PI) / 2);
  close(theta, 0);
  const paris = latLngToGlobeAngles(48.8566, 2.3522);
  close(paris.theta, (48.8566 * Math.PI) / 180);
  close(paris.phi, normalizeAngle(Math.PI - ((2.3522 * Math.PI) / 180 - Math.PI / 2)));
  assert.ok(paris.phi >= 0 && paris.phi < TAU);
});

test('theta is clamped away from the poles', () => {
  assert.equal(clampTheta(5), 1.2);
  assert.equal(clampTheta(-5), -1.2);
  assert.ok(latLngToGlobeAngles(89, 0).theta <= 1.2);
});

test('normalizeAngle wraps into [0, 2PI)', () => {
  close(normalizeAngle(-Math.PI / 2), (3 * Math.PI) / 2);
  close(normalizeAngle(5 * Math.PI), Math.PI);
  assert.equal(normalizeAngle(0), 0);
});

test('nearestEquivalentAngle takes the short way round', () => {
  const current = 10 * TAU + 0.1;
  close(nearestEquivalentAngle(current, TAU - 0.1), current - 0.2, 1e-9);
  close(nearestEquivalentAngle(0, 1), 1);
  close(nearestEquivalentAngle(0, TAU - 1), -1);
});

test('dampTowards approaches and snaps to target', () => {
  let v = 0;
  for (let i = 0; i < 200; i++) v = dampTowards(v, 1, 6, 1 / 60);
  assert.equal(v, 1);
  const one = dampTowards(0, 1, 6, 1 / 60);
  assert.ok(one > 0 && one < 1);
});

test('cssColorToRgb01 parses hex and rgb()', () => {
  assert.deepEqual(cssColorToRgb01('#ffffff', [0, 0, 0]), [1, 1, 1]);
  assert.deepEqual(cssColorToRgb01(' #f00 ', [0, 0, 0]), [1, 0, 0]);
  assert.deepEqual(cssColorToRgb01('rgb(0, 255, 0)', [0, 0, 0]), [0, 1, 0]);
  assert.deepEqual(cssColorToRgb01('oklch(1 0 0)', [0.5, 0.5, 0.5]), [0.5, 0.5, 0.5]);
});

test('locationKey normalises free text', () => {
  assert.equal(locationKey('  Paris,   France '), 'paris, france');
  assert.equal(locationKey(''), '');
  assert.equal(locationKey(undefined), '');
});

test('pendingLocationKeys dedupes and skips cached entries', () => {
  const cache = {
    paris: { status: 'found', lat: 1, lng: 2, label: 'Paris' },
    atlantis: { status: 'notfound' },
  };
  const res = pendingLocationKeys(['Paris', 'Goa', ' goa ', '', null, 'Atlantis', 'Tokyo'], cache);
  assert.deepEqual(res, ['goa', 'tokyo']);
});

test('buildNominatimUrl encodes the query with limit=1 json', () => {
  const url = buildNominatimUrl('café de flore, paris');
  assert.ok(url.startsWith('https://nominatim.openstreetmap.org/search?'));
  assert.ok(url.includes('format=json'));
  assert.ok(url.includes('limit=1'));
  assert.ok(url.includes('q=caf%C3%A9%20de%20flore%2C%20paris'));
});

test('parseNominatimResponse handles hits, empties and junk', () => {
  assert.deepEqual(parseNominatimResponse([{ lat: '48.85', lon: '2.35', display_name: 'Paris' }]), {
    status: 'found',
    lat: 48.85,
    lng: 2.35,
    label: 'Paris',
  });
  assert.deepEqual(parseNominatimResponse([]), { status: 'notfound' });
  assert.deepEqual(parseNominatimResponse({ error: 'x' }), { status: 'notfound' });
  assert.deepEqual(parseNominatimResponse([{ lat: 'abc', lon: '1' }]), { status: 'notfound' });
  assert.deepEqual(parseNominatimResponse([{ lat: '95', lon: '1' }]), { status: 'notfound' });
});

test('msUntilNextRequest enforces >= 1.1s spacing', () => {
  assert.ok(GEOCODE_MIN_INTERVAL_MS >= 1100);
  assert.equal(msUntilNextRequest(null, 5000), 0);
  assert.equal(msUntilNextRequest(1000, 1500), GEOCODE_MIN_INTERVAL_MS - 500);
  assert.equal(msUntilNextRequest(1000, 1000 + GEOCODE_MIN_INTERVAL_MS + 1), 0);
});

test('geocodeProgress counts distinct places', () => {
  const cache = { a: { status: 'found', lat: 0, lng: 0, label: '' }, b: { status: 'notfound' } };
  assert.deepEqual(geocodeProgress(['A', 'a', 'B', 'C', ''], cache), {
    total: 3,
    found: 1,
    notFound: 1,
    done: 2,
  });
});
