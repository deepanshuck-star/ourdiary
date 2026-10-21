import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Couple chat — one private thread per couple space.
// Backed by migration 15 (chat_messages, in the realtime publication).
// ============================================================================

export interface ChatMessageRow {
  id: string;
  coupleId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

function rowToMessage(r: any): ChatMessageRow {
  return {
    id: r.id,
    coupleId: r.couple_id,
    senderId: r.sender_id,
    content: r.content,
    readAt: r.read_at ?? null,
    createdAt: r.created_at,
  };
}

/**
 * The most recent `limit` messages, returned oldest-first for rendering.
 * The query itself is newest-first so the limit takes the newest window of a
 * long thread, not the first messages ever sent.
 */
export async function fetchMessagesRemote(
  supabase: SupabaseClient,
  coupleId: string,
  limit = 200
): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map(rowToMessage).reverse();
}

/** Older messages than the one you already hold, for "load earlier". */
export async function fetchMessagesBeforeRemote(
  supabase: SupabaseClient,
  coupleId: string,
  beforeISO: string,
  limit = 200
): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('couple_id', coupleId)
    .lt('created_at', beforeISO)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map(rowToMessage).reverse();
}

export async function sendMessageRemote(
  supabase: SupabaseClient,
  coupleId: string,
  senderId: string,
  content: string
): Promise<ChatMessageRow> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ couple_id: coupleId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToMessage(data);
}

export async function deleteMessageRemote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('chat_messages').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Stamps read_at on my partner's messages. RLS rejects stamping my own, so
 * the caller passes only the partner's ids (see unreadIdsToMark); the
 * `is null` guard keeps an earlier "seen" time rather than overwriting it.
 */
export async function markMessagesReadRemote(supabase: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

export interface ChatSubscriptionHandlers {
  onInsert?: (message: ChatMessageRow) => void;
  onUpdate?: (message: ChatMessageRow) => void;
  onDelete?: (id: string) => void;
}

/**
 * Live updates for one couple's thread. Returns the channel so the caller can
 * remove it on unmount — leaving it open leaks a websocket subscription per
 * mount, which shows up as duplicate messages after a few navigations.
 */
export function subscribeToChat(
  supabase: SupabaseClient,
  coupleId: string,
  handlers: ChatSubscriptionHandlers
): RealtimeChannel {
  return supabase
    .channel(`couple-chat-${coupleId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `couple_id=eq.${coupleId}` },
      (payload: any) => handlers.onInsert?.(rowToMessage(payload.new))
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `couple_id=eq.${coupleId}` },
      (payload: any) => handlers.onUpdate?.(rowToMessage(payload.new))
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `couple_id=eq.${coupleId}` },
      // A delete payload carries only the primary key, not the whole row.
      (payload: any) => handlers.onDelete?.(payload.old?.id)
    )
    .subscribe();
}
