'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  TYPING_PING_INTERVAL_MS,
  TYPING_TTL_MS,
  isTypingNow,
  isUserOnline,
  presenceLabel,
  type PresenceLabel,
  type PresenceStateLike,
} from '@/lib/features/presence';

export interface PresenceValue {
  /**
   * Whether presence can mean anything here: a live space, signed in, with a
   * partner who has joined. Demo mode has one device and no second person, so
   * the honest answer there is "we can't know" — not a green dot.
   */
  available: boolean;
  partnerOnline: boolean;
  /** When this device watched them leave; null if we never saw them here. */
  partnerLastSeenAt: number | null;
  partnerTyping: boolean;
  label: PresenceLabel;
  /** Call on every keystroke; it throttles its own pings. */
  setTyping: (typing: boolean) => void;
}

const FALLBACK: PresenceValue = {
  available: false,
  partnerOnline: false,
  partnerLastSeenAt: null,
  partnerTyping: false,
  label: { tone: 'unknown', text: 'Not here right now' },
  setTyping: () => {},
};

const PresenceContext = createContext<PresenceValue>(FALLBACK);

export function usePresence(): PresenceValue {
  return useContext(PresenceContext);
}

/**
 * One Realtime channel per couple space, shared by everything that wants to
 * know whether the other person has the app open: the navbar dot, the chat
 * header, the "they're asleep" copy.
 *
 * It lives at the provider level on purpose. A hook that opened its own
 * channel per component would mean several websockets per page and several
 * `track()` entries for the same person, which is exactly how a presence
 * list starts lying.
 */
export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { data, isLiveUser, currentUserId } = useDiary();
  const { partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;

  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const enabled = Boolean(supabase && coupleId && currentUserId);

  const [state, setState] = useState<PresenceStateLike>({});
  const [typingAt, setTypingAt] = useState<number | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const lastPingSentRef = useRef(0);

  // ------------------------------------------------------------- channel ---
  useEffect(() => {
    if (!enabled || !supabase || !currentUserId) {
      setState({});
      return;
    }

    const channel = supabase.channel(`couple-presence-${coupleId}`, {
      config: {
        // Keyed by user, so a phone and a laptop belonging to the same person
        // collapse into one entry rather than looking like two people.
        presence: { key: currentUserId },
        // We never want our own typing ping echoed back to us.
        broadcast: { self: false },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setState(channel.presenceState() as unknown as PresenceStateLike);
      })
      .on('presence', { event: 'join' }, () => {
        setState(channel.presenceState() as unknown as PresenceStateLike);
      })
      .on('presence', { event: 'leave' }, () => {
        setState(channel.presenceState() as unknown as PresenceStateLike);
      })
      .on('broadcast', { event: 'typing' }, (message: any) => {
        const payload = message?.payload;
        if (!payload || payload.userId === currentUserId) return;
        setTypingAt(payload.typing ? Date.now() : null);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Re-runs after a reconnect too, which is what re-advertises us.
          void channel.track({ userId: currentUserId, at: Date.now() });
        }
      });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      if (pingTimerRef.current !== null) {
        window.clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [enabled, supabase, coupleId, currentUserId]);

  // --------------------------------------------------------------- typing ---
  // The indicator expires on its own clock rather than waiting for a "stopped"
  // ping, which never arrives if the other tab is closed mid-sentence.
  useEffect(() => {
    if (typingAt === null) return;
    if (!isTypingNow(typingAt, Date.now())) {
      setTypingAt(null);
      return;
    }
    const remaining = typingAt + TYPING_TTL_MS - Date.now();
    const id = window.setTimeout(() => setTypingAt(null), remaining);
    return () => window.clearTimeout(id);
  }, [typingAt]);

  const sendTyping = useCallback(
    (typing: boolean) => {
      const channel = channelRef.current;
      if (!channel || !currentUserId) return;
      void channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, typing },
      });
    },
    [currentUserId]
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!enabled) return;

      if (!typing) {
        if (pingTimerRef.current !== null) {
          window.clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        lastPingSentRef.current = 0;
        sendTyping(false);
        return;
      }

      // One ping per interval however fast they type; a repeat keeps the far
      // side's TTL alive while the sentence is still being written.
      const now = Date.now();
      if (now - lastPingSentRef.current >= TYPING_PING_INTERVAL_MS) {
        lastPingSentRef.current = now;
        sendTyping(true);
      }
      if (pingTimerRef.current === null) {
        pingTimerRef.current = window.setInterval(() => {
          lastPingSentRef.current = Date.now();
          sendTyping(true);
        }, TYPING_PING_INTERVAL_MS);
      }
    },
    [enabled, sendTyping]
  );

  // -------------------------------------------------------------- derived ---
  const partnerOnline = enabled && isUserOnline(state, partnerId);

  // Remember when they dropped off, so the chat header can say "just left"
  // instead of jumping straight to a flat "offline".
  const wasOnlineRef = useRef(false);
  useEffect(() => {
    if (partnerOnline) {
      wasOnlineRef.current = true;
      setLastSeenAt(null);
    } else if (wasOnlineRef.current) {
      wasOnlineRef.current = false;
      setLastSeenAt(Date.now());
    }
  }, [partnerOnline]);

  // The ping expires on the timer above, so by render time its presence in
  // state is the answer; no clock read needed here.
  const partnerTyping = partnerOnline && typingAt !== null;

  // "Last here 9 min ago" ages as you look at it, so it is refreshed on a
  // timer instead of being computed from the clock mid-render.
  const [label, setLabel] = useState<PresenceLabel>(FALLBACK.label);
  useEffect(() => {
    const update = () => setLabel(presenceLabel(partnerOnline, lastSeenAt, Date.now()));
    update();
    // Nothing to re-tick while they're here, or while we have no idea when
    // they last were.
    if (partnerOnline || lastSeenAt === null) return;
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [partnerOnline, lastSeenAt]);

  const value = useMemo<PresenceValue>(
    () => ({
      available: enabled && Boolean(partnerId),
      partnerOnline,
      partnerLastSeenAt: lastSeenAt,
      partnerTyping,
      label,
      setTyping,
    }),
    [enabled, partnerId, partnerOnline, lastSeenAt, partnerTyping, label, setTyping]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
