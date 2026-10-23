'use client';

import { useEffect, useState } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchLastPartnerMessageRemote } from '@/lib/supabase/chat';
import { stripLegacyProfileTag } from '@/lib/features/chat';
import type { HandoffMessage } from '@/lib/features/handoff';
import type { ProfileId } from '@/types';

interface LocalChatMessage {
  id: string;
  senderId: ProfileId;
  content: string;
  createdAt: string;
  readAt: string | null;
}

/**
 * The last thing the other person said — the "before bed" line on the
 * good-morning card.
 *
 * One row, read once on mount. It deliberately does not subscribe: the card
 * is about someone who is asleep and therefore not typing, and the chat page
 * already holds a live subscription for when they aren't.
 */
export function usePartnerLastMessage(): HandoffMessage | null {
  const { data, isLiveUser, currentUserId } = useDiary();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase && coupleId && currentUserId);

  const [remote, setRemote] = useState<HandoffMessage | null>(null);
  const [local] = useLocalState<LocalChatMessage[]>(`chat:${coupleId || 'demo'}`, []);

  useEffect(() => {
    if (!isRemote || !supabase || !currentUserId) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    fetchLastPartnerMessageRemote(supabase, coupleId, currentUserId)
      .then((row) => {
        if (cancelled) return;
        setRemote(
          row ? { id: row.id, content: stripLegacyProfileTag(row.content), createdAt: row.createdAt } : null
        );
      })
      .catch((err) => {
        console.warn('[OurDiary] Could not read the last message for the handoff card:', err);
        if (!cancelled) setRemote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isRemote, supabase, coupleId, currentUserId]);

  if (isRemote) return remote;

  // Demo mode: the thread is on this device, and "they" is the other slot.
  for (let i = local.length - 1; i >= 0; i -= 1) {
    const message = local[i];
    if (message.senderId !== data.activeProfileId) {
      return {
        id: message.id,
        content: stripLegacyProfileTag(message.content),
        createdAt: message.createdAt,
      };
    }
  }
  return null;
}
