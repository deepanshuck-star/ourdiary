'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLocalState } from '@/lib/local-store';
import {
  fetchNotificationsRemote,
  markAllNotificationsReadRemote,
  markNotificationsReadRemote,
  subscribeToNotifications,
  type NotificationRow,
} from '@/lib/supabase/notifications';
import { mergeNotifications, unreadCount, unreadIds } from '@/lib/features/notifications';

/** One shape for the UI, whichever mode supplied the row. */
export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Demo-mode row. Same shape, kept on this device. */
type LocalNotification = NotificationItem;

// A stable fallback, so useLocalState's setter keeps its identity across
// renders — the bell's "mark visible read" effect depends on it.
const NO_LOCAL: LocalNotification[] = [];

export interface NotificationsState {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: string;
  isRemote: boolean;
  /**
   * False in demo mode and before a partner has joined — there is nobody to
   * notify you, so the bell renders nothing at all (same rule as presence).
   */
  available: boolean;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  reload: () => Promise<void>;
}

/**
 * The signed-in person's notification feed.
 *
 * Live space: rows from `notifications`, kept current over realtime. Demo
 * mode: the same shape in device-local storage, so every screen below works
 * without Supabase.
 */
export function useNotifications(): NotificationsState {
  const { data, isLiveUser, currentUserId, showToast } = useDiary();
  const { partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase && coupleId && currentUserId);

  const [remote, setRemote] = useState<NotificationRow[]>([]);
  const [local, setLocal] = useLocalState<LocalNotification[]>(`notifications:${coupleId}`, NO_LOCAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const items: NotificationItem[] = useMemo(() => {
    const base: NotificationItem[] = isRemote
      ? remote.map((n) => ({
          id: n.id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          href: n.href,
          actorId: n.actorId,
          readAt: n.readAt,
          createdAt: n.createdAt,
        }))
      : local;
    return mergeNotifications(base, []);
  }, [isRemote, remote, local]);

  const unread = useMemo(() => unreadCount(items), [items]);

  // ------------------------------------------------------------- loading ---
  const reload = useCallback(async () => {
    if (!isRemote || !supabase || !currentUserId) {
      setLoading(false);
      return;
    }
    try {
      setRemote(await fetchNotificationsRemote(supabase, currentUserId));
      setError('');
    } catch (err) {
      console.error('[OurDiary] Failed to load notifications:', err);
      setError('We couldn’t load your notifications just now.');
    } finally {
      setLoading(false);
    }
  }, [isRemote, supabase, currentUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ------------------------------------------------------------ realtime ---
  useEffect(() => {
    if (!isRemote || !supabase || !currentUserId) return;
    const channel = subscribeToNotifications(supabase, coupleId, {
      // RLS only delivers my own rows, but the couple filter is the one
      // postgres_changes can apply — check the recipient here too.
      onInsert: (n) => {
        if (n.recipientId !== currentUserId) return;
        setRemote((prev) => mergeNotifications(prev, [n]));
      },
      onUpdate: (n) => {
        if (n.recipientId !== currentUserId) return;
        setRemote((prev) => prev.map((row) => (row.id === n.id ? n : row)));
      },
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isRemote, supabase, coupleId, currentUserId]);

  // --------------------------------------------------------- mark as read ---
  const markRead = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const wanted = new Set(ids);
      const stamp = new Date().toISOString();

      if (!isRemote || !supabase) {
        setLocal((prev) => prev.map((n) => (wanted.has(n.id) && !n.readAt ? { ...n, readAt: stamp } : n)));
        return;
      }

      // Clear the badge straight away; the realtime echo confirms it.
      setRemote((prev) => prev.map((n) => (wanted.has(n.id) && !n.readAt ? { ...n, readAt: stamp } : n)));
      markNotificationsReadRemote(supabase, ids).catch((err) => {
        console.warn('[OurDiary] Could not mark notifications read:', err);
      });
    },
    [isRemote, supabase, setLocal]
  );

  const markAllRead = useCallback(() => {
    const ids = unreadIds(items);
    if (ids.length === 0) return;
    const stamp = new Date().toISOString();

    if (!isRemote || !supabase || !currentUserId) {
      setLocal((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: stamp })));
      return;
    }

    setRemote((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: stamp })));
    markAllNotificationsReadRemote(supabase, currentUserId).catch((err) => {
      console.warn('[OurDiary] Could not mark all notifications read:', err);
      showToast('Those couldn’t be marked as read just now.', 'warn');
      void reload();
    });
  }, [items, isRemote, supabase, currentUserId, setLocal, showToast, reload]);

  return {
    items,
    unread,
    loading,
    error,
    isRemote,
    available: isRemote && Boolean(partnerId),
    markRead,
    markAllRead,
    reload,
  };
}
