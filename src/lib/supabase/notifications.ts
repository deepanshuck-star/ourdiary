import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Notification feed — one row per thing the other person did.
// Backed by migration 20 (notifications, in the realtime publication).
//
// RLS does the filtering: you only ever see rows addressed to you, you may
// only raise one inside your own couple, and marking read is the only update
// you may make. The queries below say the same thing anyway, so a change in
// policy shows up as an empty list rather than someone else's feed.
// ============================================================================

export interface NotificationRow {
  id: string;
  coupleId: string;
  recipientId: string;
  /** Null when the app itself raised it, like an anniversary arriving. */
  actorId: string | null;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NewNotification {
  recipientId: string;
  /** Must be the signed-in user or null — the insert policy rejects a forged actor. */
  actorId: string | null;
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
}

function rowToNotification(r: any): NotificationRow {
  return {
    id: r.id,
    coupleId: r.couple_id,
    recipientId: r.recipient_id,
    actorId: r.actor_id ?? null,
    kind: r.kind,
    title: r.title,
    body: r.body ?? null,
    href: r.href ?? null,
    readAt: r.read_at ?? null,
    createdAt: r.created_at,
  };
}

/** My feed, newest first. */
export async function fetchNotificationsRemote(
  supabase: SupabaseClient,
  recipientId: string,
  limit = 100
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map(rowToNotification);
}

/**
 * Stamps read_at on the given rows. The `is null` guard keeps the first time
 * they were seen rather than pushing it forward on every re-open.
 */
export async function markNotificationsReadRemote(supabase: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

/** "Mark all read" — done in one statement so a long feed is still one round trip. */
export async function markAllNotificationsReadRemote(
  supabase: SupabaseClient,
  recipientId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

/**
 * Raises a notification for the other person.
 *
 * Nothing calls this yet — wiring memories, chat and mood up to it is a
 * follow-up. It lives here so the feature has one place to write from.
 */
export async function createNotificationRemote(
  supabase: SupabaseClient,
  coupleId: string,
  input: NewNotification
): Promise<NotificationRow> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      couple_id: coupleId,
      recipient_id: input.recipientId,
      actor_id: input.actorId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToNotification(data);
}

export async function deleteNotificationRemote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface NotificationSubscriptionHandlers {
  onInsert?: (notification: NotificationRow) => void;
  onUpdate?: (notification: NotificationRow) => void;
}

/**
 * Live feed for one couple. Returns the channel so the caller can remove it
 * on unmount — leaving it open leaks a websocket subscription per mount,
 * which shows up as the same notification arriving several times.
 *
 * Filtered on couple_id because that is what postgres_changes can filter on;
 * RLS still limits delivery to rows addressed to this user, and the caller
 * drops anything else anyway.
 */
export function subscribeToNotifications(
  supabase: SupabaseClient,
  coupleId: string,
  handlers: NotificationSubscriptionHandlers
): RealtimeChannel {
  return supabase
    .channel(`couple-notifications-${coupleId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `couple_id=eq.${coupleId}` },
      (payload: any) => handlers.onInsert?.(rowToNotification(payload.new))
    )
    .on(
      'postgres_changes',
      // Read elsewhere (their phone) should clear the bell here too.
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `couple_id=eq.${coupleId}` },
      (payload: any) => handlers.onUpdate?.(rowToNotification(payload.new))
    )
    .subscribe();
}
