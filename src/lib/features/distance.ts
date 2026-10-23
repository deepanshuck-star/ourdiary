// The distance counter: one line with the three numbers that describe a
// long-distance relationship. Import-free so `node --test` can load it
// directly — see tests/distance.test.mjs.
//
//   "4,178 km apart · 312 days together · 19 days until you're not"
//
// Nothing here is new data. The kilometres come from the two home cities run
// through the geocoder the Memory Globe already uses, the days together from
// the couple's start date, and the reunion from the next trip. It is a
// screenshot, which is the point.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface HomePlace extends LatLng {
  /** What the person typed, e.g. "Kolkata". */
  query: string;
  /** What the geocoder resolved it to. */
  label?: string;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const KM_PER_MILE = 1.609344;

export type DistanceUnit = 'km' | 'mi';

export function formatDistance(km: number, unit: DistanceUnit = 'km'): string {
  const value = unit === 'mi' ? km / KM_PER_MILE : km;
  // Under 10 away, a whole number reads as a rounding error; show one decimal.
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded.toLocaleString('en-US')} ${unit}`;
}

export interface DistanceInput {
  mine: HomePlace | null;
  theirs: HomePlace | null;
  daysTogether: number;
  /** Days until the next visit, or null when nothing is booked. */
  daysUntilReunion: number | null;
  unit?: DistanceUnit;
}

export interface DistanceSummary {
  km: number | null;
  distanceText: string | null;
  daysTogetherText: string;
  reunionText: string | null;
  /** The whole thing as one line, for the card and for screenshots. */
  line: string;
  /** True once both cities have been resolved. */
  complete: boolean;
}

/**
 * Builds the line, degrading honestly: with one city missing it drops the
 * distance rather than inventing a zero, and with no trip booked it says so
 * instead of counting down to nothing.
 */
export function buildDistanceSummary(input: DistanceInput): DistanceSummary {
  const { mine, theirs, daysTogether, daysUntilReunion, unit = 'km' } = input;

  const km = mine && theirs ? haversineKm(mine, theirs) : null;
  const distanceText = km === null ? null : `${formatDistance(km, unit)} apart`;

  const days = Math.max(0, Math.round(daysTogether));
  const daysTogetherText = `${days.toLocaleString('en-US')} ${days === 1 ? 'day' : 'days'} together`;

  let reunionText: string | null = null;
  if (daysUntilReunion !== null) {
    if (daysUntilReunion > 1) {
      reunionText = `${daysUntilReunion.toLocaleString('en-US')} days until you're not`;
    } else if (daysUntilReunion === 1) {
      reunionText = 'together again tomorrow';
    } else {
      reunionText = 'together right now';
    }
  }

  const parts = [distanceText, daysTogetherText, reunionText].filter(Boolean) as string[];
  return {
    km,
    distanceText,
    daysTogetherText,
    reunionText,
    line: parts.join(' · '),
    complete: km !== null,
  };
}

/**
 * Roughly how long a direct flight between the two takes, for the "that's
 * only N hours" moment. Cruising speed plus an allowance for taxi, climb and
 * descent — a sentence, not a booking tool.
 */
export function approxFlightHours(km: number): number {
  const CRUISE_KMH = 850;
  const OVERHEAD_H = 0.75;
  return Math.round((km / CRUISE_KMH + OVERHEAD_H) * 10) / 10;
}
