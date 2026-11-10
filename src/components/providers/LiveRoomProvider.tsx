'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isUserOnline, type PresenceStateLike } from '@/lib/features/presence';
import {
  REACTION_TTL_MS,
  canSendReaction,
  parseReactionPayload,
  pruneReactions,
  type LiveReaction,
  type ReactionEmoji,
} from '@/lib/features/reactions';

export interface LiveRoom {
  /**
   * Whether "is my partner here?" can be answered at all: a live space with a
   * partner who has joined. In demo mode both people share one device, so
   * there is no second screen to be on — the honest answer is "unknown", and
   * the UI shows nothing rather than a made-up green dot.
   */
  available: boolean;
  /** The partner currently has this same screen open (this game, this chat). */
  partnerHere: boolean;
  myId: string | null;
  partnerId: string | null;
  /** Reactions currently floating, from either person. */
  reactions: LiveReaction[];
  /** Floats an emoji on this screen and, in a live space, on theirs. */
  sendReaction: (emoji: ReactionEmoji) => void;
}

const FALLBACK: LiveRoom = {
  available: false,
  partnerHere: false,
  myId: null,
  partnerId: null,
  reactions: [],
  sendReaction: () => {},
};

const LiveRoomContext = createContext<LiveRoom>(FALLBACK);

/** The room opened by the nearest <LiveRoomProvider>, or an inert fallback. */
export function useLiveRoomContext(): LiveRoom {
  return useContext(LiveRoomContext);
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * One Realtime channel per screen the two of you can share — a game, the chat.
 *
 * Presence on it answers "are they looking at this right now?", which the
 * couple-wide PresenceProvider can't: that one says the app is open, not
 * which screen. Broadcast on it carries reactions, which are moments, not
 * records, so they are never written to the database.
 */
export function useLiveRoom(roomKey: string | null): LiveRoom {
  const { data, isLiveUser, currentUserId } = useDiary();
  const { myId, partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;

  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const live = Boolean(supabase && coupleId && currentUserId && roomKey);

  const [presence, setPresence] = useState<PresenceStateLike>({});
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const lastSentRef = useRef<number | null>(null);

  useEffect(() => {
    if (!live || !supabase || !currentUserId || !roomKey) {
      setPresence({});
      return;
    }
    const channel = supabase.channel(`room-${coupleId}-${roomKey}`, {
      config: {
        presence: { key: currentUserId },
        // Our own reaction is drawn the moment we tap; an echo would draw it twice.
        broadcast: { self: false },
      },
    });
    const sync = () => setPresence(channel.presenceState() as unknown as PresenceStateLike);

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .on('broadcast', { event: 'reaction' }, (message: any) => {
        const reaction = parseReactionPayload(message?.payload, Date.now());
        // Only the partner's reactions come over the wire; drop anything else.
        if (!reaction || reaction.from === currentUserId) return;
        setReactions((prev) => pruneReactions([...prev, reaction], Date.now()));
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') void channel.track({ userId: currentUserId, at: Date.now() });
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [live, supabase, coupleId, currentUserId, roomKey]);

  // Clear finished floats. Runs only while something is on screen.
  useEffect(() => {
    if (reactions.length === 0) return;
    const timer = window.setTimeout(
      () => setReactions((prev) => pruneReactions(prev, Date.now())),
      REACTION_TTL_MS / 4
    );
    return () => window.clearTimeout(timer);
  }, [reactions]);

  const sendReaction = useCallback(
    (emoji: ReactionEmoji) => {
      const now = Date.now();
      if (!canSendReaction(lastSentRef.current, now) || !myId) return;
      lastSentRef.current = now;
      const reaction: LiveReaction = { id: newId(), emoji, from: myId, at: now, x: 0.15 + Math.random() * 0.7 };
      setReactions((prev) => pruneReactions([...prev, reaction], now));
      const channel = channelRef.current;
      if (channel) {
        void channel.send({
          type: 'broadcast',
          event: 'reaction',
          payload: { id: reaction.id, emoji, from: myId, x: reaction.x },
        });
      }
    },
    [myId]
  );

  return {
    available: live && Boolean(partnerId),
    partnerHere: live && isUserOnline(presence, partnerId),
    myId,
    partnerId,
    reactions,
    sendReaction,
  };
}

/** Opens a room for everything inside it, so nested components share one channel. */
export function LiveRoomProvider({ roomKey, children }: { roomKey: string; children: React.ReactNode }) {
  const room = useLiveRoom(roomKey);
  return <LiveRoomContext.Provider value={room}>{children}</LiveRoomContext.Provider>;
}
