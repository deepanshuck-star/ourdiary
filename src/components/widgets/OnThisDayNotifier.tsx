'use client';

import { useEffect } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { getNotificationPermission, isNotificationSupported, sendPushNotification } from '@/lib/notifications';
import { memoriesOnThisDay, toISODate } from '@/lib/features/countdowns';

/**
 * Fires at most one "On this day" notification per day when a memory from an
 * earlier year shares today's month/day. Never asks for permission itself — it
 * only notifies if permission was already granted elsewhere (e.g. Settings).
 * Renders nothing; safe to mount globally.
 */
export function OnThisDayNotifier() {
  const { data, isHydrated } = useDiary();
  const [lastNotified, setLastNotified] = useLocalState<string>(
    `onThisDay:lastNotified:${data.couple.id}`,
    ''
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (!isNotificationSupported() || getNotificationPermission() !== 'granted') return;
    const now = new Date();
    const today = toISODate(now);
    if (lastNotified === today) return;
    const matches = memoriesOnThisDay(data.memories, today);
    if (matches.length === 0) return;

    setLastNotified(today);
    const memory = matches[0];
    const years = now.getFullYear() - Number(memory.date.slice(0, 4));
    const extra = matches.length > 1 ? ` (and ${matches.length - 1} more)` : '';
    void sendPushNotification('On this day', {
      body: `${years} year${years === 1 ? '' : 's'} ago: ${memory.title}${extra}. Take a moment to look back together.`,
      url: `/memories/${memory.id}`,
      tag: `on-this-day-${today}`,
    });
  }, [isHydrated, data.memories, lastNotified, setLastNotified]);

  return null;
}

export default OnThisDayNotifier;
