'use client';

import { useCallback, useMemo } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { useLocalState } from '@/lib/local-store';
import { newId, useNow } from '@/hooks/useNow';
import { localDayKey } from '@/lib/features/photoOfDay';
import {
  daysUntilTrip,
  nextTrip,
  sortTrips,
  splitTrip,
  type Trip,
  type TripCost,
  type TripSplit,
} from '@/lib/features/trips';

export interface TripsApi {
  trips: Trip[];
  /** Soonest-first, with past visits after. */
  sorted: Trip[];
  next: Trip | null;
  /** Days until the next visit, or null when nothing is planned. */
  daysUntilReunion: number | null;
  /** Local calendar date; null until mounted. */
  todayISO: string | null;
  myId: string | null;
  partnerId: string | null;
  addTrip: (draft: Omit<Trip, 'id' | 'costs' | 'createdBy' | 'createdAt'>) => void;
  updateTrip: (id: string, updates: Partial<Omit<Trip, 'id' | 'costs'>>) => void;
  removeTrip: (id: string) => void;
  addCost: (tripId: string, cost: Omit<TripCost, 'id' | 'createdAt'>) => void;
  removeCost: (tripId: string, costId: string) => void;
  split: (trip: Trip) => TripSplit;
}

/**
 * Trips are the thing a long-distance couple plans around, so they are the
 * one countdown worth joining to real money: the date and the split are the
 * same conversation.
 */
export function useTrips(): TripsApi {
  const { data } = useDiary();
  const { myId, partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;
  // Once a minute is plenty — this is a day counter, not a clock.
  const now = useNow(60_000);

  const [trips, setTrips] = useLocalState<Trip[]>(`trips:${coupleId || 'demo'}`, []);

  const todayISO = now === null ? null : localDayKey(new Date(now));

  const sorted = useMemo(() => (todayISO ? sortTrips(trips, todayISO) : trips), [trips, todayISO]);
  const next = useMemo(() => (todayISO ? nextTrip(trips, todayISO) : null), [trips, todayISO]);
  const daysUntilReunion = next && todayISO ? daysUntilTrip(next, todayISO) : null;

  const addTrip = useCallback<TripsApi['addTrip']>(
    (draft) => {
      if (!myId) return;
      setTrips((prev) => [
        ...prev,
        { ...draft, id: newId('trip'), costs: [], createdBy: myId, createdAt: new Date().toISOString() },
      ]);
    },
    [myId, setTrips]
  );

  const updateTrip = useCallback<TripsApi['updateTrip']>(
    (id, updates) => setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t))),
    [setTrips]
  );

  const removeTrip = useCallback(
    (id: string) => setTrips((prev) => prev.filter((t) => t.id !== id)),
    [setTrips]
  );

  const addCost = useCallback<TripsApi['addCost']>(
    (tripId, cost) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, costs: [...t.costs, { ...cost, id: newId('cost'), createdAt: new Date().toISOString() }] }
            : t
        )
      );
    },
    [setTrips]
  );

  const removeCost = useCallback(
    (tripId: string, costId: string) => {
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, costs: t.costs.filter((c) => c.id !== costId) } : t))
      );
    },
    [setTrips]
  );

  const split = useCallback((trip: Trip) => splitTrip(trip, myId, partnerId), [myId, partnerId]);

  return {
    trips,
    sorted,
    next,
    daysUntilReunion,
    todayISO,
    myId,
    partnerId,
    addTrip,
    updateTrip,
    removeTrip,
    addCost,
    removeCost,
    split,
  };
}
