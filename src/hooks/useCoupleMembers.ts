'use client';

import { useEffect, useState } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchCoupleMemberIdsRemote } from '@/lib/supabase/profiles';

export interface CoupleMemberIds {
  /** The signed-in user's id, or their profile slot in demo mode. */
  myId: string | null;
  /** The partner's id, or their profile slot in demo mode. Null until they join. */
  partnerId: string | null;
  isRemote: boolean;
  loading: boolean;
}

/**
 * Both partners' identifiers for features that record a direction between
 * the two people — who gave the gift, whose habit it is.
 *
 * In a live space these are real auth user ids. In demo mode there are no
 * accounts, so the profile slots ('user_1' / 'user_2') stand in: the same
 * rendering and splitting code then works unchanged in both modes.
 */
export function useCoupleMembers(): CoupleMemberIds {
  const { data, isLiveUser, currentUserId } = useDiary();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase && coupleId && currentUserId);

  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isRemote);

  const demoMyId = data.activeProfileId;
  const demoPartnerId = data.activeProfileId === 'user_1' ? 'user_2' : 'user_1';

  useEffect(() => {
    if (!isRemote || !supabase || !currentUserId) {
      setPartnerId(null);
      setLoading(false);
      return;
    }
    let cancelled = true;
    cancelled = false;
    setLoading(true);
    fetchCoupleMemberIdsRemote(supabase, coupleId, currentUserId)
      .then((ids) => {
        if (!cancelled) setPartnerId(ids.partner);
      })
      .catch((err) => {
        console.error('[OurDiary] Failed to look up couple members:', err);
        if (!cancelled) setPartnerId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isRemote, supabase, coupleId, currentUserId]);

  if (!isRemote) {
    return { myId: demoMyId, partnerId: demoPartnerId, isRemote: false, loading: false };
  }
  return { myId: currentUserId, partnerId, isRemote: true, loading };
}
