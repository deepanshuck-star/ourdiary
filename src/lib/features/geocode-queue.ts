// Pure helpers for geocoding memory locations through OpenStreetMap Nominatim.
// Nominatim usage policy: at most 1 request per second, cache results. We wait >= 1.1s.

export const GEOCODE_MIN_INTERVAL_MS = 1100;
export const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export type GeocodeHit = { status: 'found'; lat: number; lng: number; label: string };
export type GeocodeMiss = { status: 'notfound' };
export type GeocodeEntry = GeocodeHit | GeocodeMiss;
export type GeocodeCache = Record<string, GeocodeEntry>;

/** Cache key for a free-text location: trimmed, whitespace collapsed, lower-cased. */
export function locationKey(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Unique, non-empty location keys (first-seen order) that are not yet cached. */
export function pendingLocationKeys(locations: Array<string | null | undefined>, cache: GeocodeCache): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of locations) {
    const key = locationKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!Object.prototype.hasOwnProperty.call(cache, key)) out.push(key);
  }
  return out;
}

export function buildNominatimUrl(query: string): string {
  const params = [
    'format=json',
    'limit=1',
    'accept-language=en',
    'q=' + encodeURIComponent(query),
  ];
  return NOMINATIM_ENDPOINT + '?' + params.join('&');
}

/** Turn a Nominatim JSON body into a cache entry. Anything unusable counts as "not found". */
export function parseNominatimResponse(body: unknown): GeocodeEntry {
  if (!Array.isArray(body) || body.length === 0) return { status: 'notfound' };
  const first = body[0] as { lat?: unknown; lon?: unknown; display_name?: unknown } | null;
  if (!first || typeof first !== 'object') return { status: 'notfound' };
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { status: 'notfound' };
  }
  const label = typeof first.display_name === 'string' ? first.display_name : '';
  return { status: 'found', lat, lng, label };
}

/** Milliseconds still to wait before the next request is allowed. */
export function msUntilNextRequest(lastRequestAt: number | null, now: number, interval = GEOCODE_MIN_INTERVAL_MS): number {
  if (lastRequestAt === null) return 0;
  return Math.max(0, lastRequestAt + interval - now);
}

/** Progress summary across all distinct locations. */
export function geocodeProgress(locations: Array<string | null | undefined>, cache: GeocodeCache) {
  const keys = new Set<string>();
  for (const raw of locations) {
    const key = locationKey(raw);
    if (key) keys.add(key);
  }
  let found = 0;
  let notFound = 0;
  keys.forEach((key) => {
    const entry = cache[key];
    if (!entry) return;
    if (entry.status === 'found') found += 1;
    else notFound += 1;
  });
  return { total: keys.size, found, notFound, done: found + notFound };
}
