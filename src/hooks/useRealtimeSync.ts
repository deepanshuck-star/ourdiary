'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDiary } from '@/store/DiaryContext';

export function useRealtimeSync(coupleId?: string, currentUserId?: string) {
  const { showToast } = useDiary();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !coupleId) {
      return;
    }

    // Subscribe to couple channel
    const channelName = `couple-realtime-${coupleId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            showToast('New relationship memory added! 💕', 'info');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_notes',
        },
        (payload: any) => {
          const newRecord = payload.new as any;
          // Security filter: Never alert or process private notes of the other partner
          if (newRecord?.visibility === 'private' && newRecord?.author_id !== currentUserId) {
            return;
          }
          if (payload.eventType === 'INSERT') {
            showToast('A new shared note was posted ✨', 'info');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            showToast('New calendar event added 📅', 'info');
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Connected to Realtime channel for couple: ${coupleId}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [coupleId, currentUserId, showToast]);
}
