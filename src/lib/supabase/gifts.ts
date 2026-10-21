import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Gifts wardrobe — who gave what to whom. Backed by migration 17.
// ============================================================================

export interface GiftRow {
  id: string;
  coupleId: string;
  fromUserId: string;
  toUserId: string;
  createdBy: string;
  title: string;
  occasion: string | null;
  note: string | null;
  photoUrl: string | null;
  photoPublicId: string | null;
  givenOn: string | null;
  createdAt: string;
}

function rowToGift(r: any): GiftRow {
  return {
    id: r.id,
    coupleId: r.couple_id,
    fromUserId: r.from_user_id,
    toUserId: r.to_user_id,
    createdBy: r.created_by,
    title: r.title,
    occasion: r.occasion,
    note: r.note,
    photoUrl: r.photo_url,
    photoPublicId: r.photo_public_id,
    givenOn: r.given_on,
    createdAt: r.created_at,
  };
}

export async function fetchGiftsRemote(supabase: SupabaseClient, coupleId: string): Promise<GiftRow[]> {
  const { data, error } = await supabase
    .from('gifts')
    .select('*')
    .eq('couple_id', coupleId)
    .order('given_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToGift);
}

export async function createGiftRemote(
  supabase: SupabaseClient,
  coupleId: string,
  createdBy: string,
  gift: {
    fromUserId: string;
    toUserId: string;
    title: string;
    occasion?: string;
    note?: string;
    photoUrl?: string | null;
    photoPublicId?: string | null;
    givenOn?: string | null;
  }
): Promise<GiftRow> {
  const { data, error } = await supabase
    .from('gifts')
    .insert({
      couple_id: coupleId,
      from_user_id: gift.fromUserId,
      to_user_id: gift.toUserId,
      created_by: createdBy,
      title: gift.title,
      occasion: gift.occasion?.trim() || null,
      note: gift.note?.trim() || null,
      photo_url: gift.photoUrl || null,
      photo_public_id: gift.photoPublicId || null,
      given_on: gift.givenOn || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToGift(data);
}

export async function updateGiftRemote(
  supabase: SupabaseClient,
  id: string,
  updates: { title?: string; occasion?: string | null; note?: string | null; givenOn?: string | null }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.occasion !== undefined) patch.occasion = updates.occasion?.trim() || null;
  if (updates.note !== undefined) patch.note = updates.note?.trim() || null;
  if (updates.givenOn !== undefined) patch.given_on = updates.givenOn || null;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('gifts').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteGiftRemote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('gifts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
