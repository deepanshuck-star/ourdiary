'use client';

import { useCallback, useMemo } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { useNow } from '@/hooks/useNow';
import { sleepStateFor, type SleepState } from '@/lib/features/timezones';
import type { DistanceUnit, HomePlace } from '@/lib/features/distance';
import type { ProfileId } from '@/types';

/**
 * The shared long-distance settings: each partner's time zone and home city.
 *
 * This blob is in the synced-key allowlist (see src/lib/local-store.ts), and
 * it has to be: knowing when the other person's morning starts is the whole
 * basis of the sleep-aware features, and that fact lives on their phone.
 * Before it synced, the long-distance page could only ever tell you about
 * yourself.
 */
export interface LongDistanceState {
  zones: Partial<Record<ProfileId, string>>;
  homes?: Partial<Record<ProfileId, HomePlace>>;
  /** The scheduled start of a watch-together, set by one of you. */
  watch?: { title: string; startUtc: number; setBy: ProfileId };
  unit?: DistanceUnit;
}

const FALLBACK: LongDistanceState = { zones: {} };

export interface LongDistanceInfo {
  state: LongDistanceState;
  me: ProfileId;
  partner: ProfileId;
  myZone: string;
  partnerZone: string;
  myZoneIsSet: boolean;
  partnerZoneIsSet: boolean;
  myHome: HomePlace | null;
  partnerHome: HomePlace | null;
  /** Null until mounted — the clock does not exist during a server render. */
  now: number | null;
  mySleep: SleepState | null;
  partnerSleep: SleepState | null;
  /** This device's zone, used until someone picks one explicitly. */
  deviceZone: string;
  unit: DistanceUnit;
  setZone: (who: ProfileId, zone: string) => void;
  setHome: (who: ProfileId, home: HomePlace | null) => void;
  setUnit: (unit: DistanceUnit) => void;
  setWatch: (watch: LongDistanceState['watch']) => void;
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * `tickMs` is how often the derived sleep state refreshes. The long-distance
 * page wants a ticking clock; a dashboard card does not need to re-render
 * every second to say "they're asleep".
 */
export function useLongDistance(tickMs = 60_000): LongDistanceInfo {
  const { data } = useDiary();
  const coupleId = data.couple.id;
  const now = useNow(tickMs);

  const [state, setState] = useLocalState<LongDistanceState>(`longDistance:${coupleId}`, FALLBACK);

  const me = data.activeProfileId;
  const partner: ProfileId = me === 'user_1' ? 'user_2' : 'user_1';

  // Resolved only after mount, so the server render and the first client
  // render agree on what the zone is.
  const deviceZone = now === null ? 'UTC' : deviceTimeZone();
  const myZone = state.zones[me] ?? deviceZone;
  const partnerZone = state.zones[partner] ?? deviceZone;

  const setZone = useCallback(
    (who: ProfileId, zone: string) => {
      setState((prev) => ({ ...prev, zones: { ...prev.zones, [who]: zone } }));
    },
    [setState]
  );

  const setHome = useCallback(
    (who: ProfileId, home: HomePlace | null) => {
      setState((prev) => {
        const homes = { ...(prev.homes || {}) };
        if (home) homes[who] = home;
        else delete homes[who];
        return { ...prev, homes };
      });
    },
    [setState]
  );

  const setUnit = useCallback(
    (unit: DistanceUnit) => setState((prev) => ({ ...prev, unit })),
    [setState]
  );

  const setWatch = useCallback(
    (watch: LongDistanceState['watch']) => setState((prev) => ({ ...prev, watch })),
    [setState]
  );

  const { mySleep, partnerSleep } = useMemo(() => {
    if (now === null) return { mySleep: null, partnerSleep: null };
    return {
      mySleep: sleepStateFor(now, myZone),
      partnerSleep: sleepStateFor(now, partnerZone),
    };
  }, [now, myZone, partnerZone]);

  return {
    state,
    me,
    partner,
    myZone,
    partnerZone,
    myZoneIsSet: Boolean(state.zones[me]),
    partnerZoneIsSet: Boolean(state.zones[partner]),
    myHome: state.homes?.[me] ?? null,
    partnerHome: state.homes?.[partner] ?? null,
    now,
    mySleep,
    partnerSleep,
    deviceZone,
    unit: state.unit ?? 'km',
    setZone,
    setHome,
    setUnit,
    setWatch,
  };
}
