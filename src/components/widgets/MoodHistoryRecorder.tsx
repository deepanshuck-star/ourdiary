'use client';

import { useEffect } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { addSnapshot, type MoodSnapshot, type PartnerKey } from '@/lib/features/moodHistory';

const EMPTY: MoodSnapshot[] = [];

export function moodHistoryKey(coupleId: string) {
  return `mood-history:${coupleId}`;
}

/** Device-local log of every mood check-in either partner has made. */
export function useMoodHistory(): MoodSnapshot[] {
  const { data } = useDiary();
  const [history] = useLocalState<MoodSnapshot[]>(moodHistoryKey(data.couple.id), EMPTY);
  return history;
}

/**
 * Invisible: whenever either partner's mood beacon changes, keep a snapshot of it so the
 * history survives the next check-in (the beacon itself only stores the latest mood).
 * Snapshots double as the streak's activity log.
 */
export function MoodHistoryRecorder() {
  const { data, isHydrated } = useDiary();
  const [, setHistory] = useLocalState<MoodSnapshot[]>(moodHistoryKey(data.couple.id), EMPTY);
  const u1 = data.moodBeacons?.user_1;
  const u2 = data.moodBeacons?.user_2;

  useEffect(() => {
    if (!isHydrated) return;
    const entries: [PartnerKey, typeof u1][] = [
      ['user_1', u1],
      ['user_2', u2],
    ];
    setHistory((prev) => {
      let next = prev;
      for (const [profileId, beacon] of entries) {
        if (!beacon?.updatedAt) continue;
        next = addSnapshot(next, {
          profileId,
          mood: beacon.mood,
          updatedAt: beacon.updatedAt,
          note: beacon.customNote,
        });
      }
      return next;
    });
    // Only re-run when a beacon actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, u1?.mood, u1?.updatedAt, u2?.mood, u2?.updatedAt]);

  return null;
}
