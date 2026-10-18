import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Generic feature-state sync — backs useLocalState() for the keys that need
// to be shared across both partners' devices (see src/lib/local-store.ts).
// Each local-storage key maps 1:1 to a `feature_key` row in Supabase.
// ============================================================================

export interface FeatureStateRow {
  featureKey: string;
  ownerUserId: string | null;
  data: unknown;
  updatedAt: string;
}

/** Fetch every synced feature-state row for a couple (one query covers all keys). */
export async function fetchFeatureStateRemote(
  supabase: SupabaseClient,
  coupleId: string
): Promise<FeatureStateRow[]> {
  const { data, error } = await supabase
    .from('feature_state')
    .select('feature_key, owner_user_id, data, updated_at')
    .eq('couple_id', coupleId);
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    featureKey: r.feature_key,
    ownerUserId: r.owner_user_id,
    data: r.data,
    updatedAt: r.updated_at,
  }));
}

/**
 * Upsert one feature-state blob. `ownerUserId: null` means a shared blob
 * either partner may write; otherwise only the real owner's writes succeed
 * (enforced by RLS too, this call just mirrors that contract client-side).
 */
export async function upsertFeatureStateRemote(
  supabase: SupabaseClient,
  coupleId: string,
  featureKey: string,
  ownerUserId: string | null,
  value: unknown
): Promise<void> {
  const onConflict = ownerUserId === null ? 'couple_id,feature_key' : 'couple_id,feature_key,owner_user_id';
  const { error } = await supabase.from('feature_state').upsert(
    {
      couple_id: coupleId,
      feature_key: featureKey,
      owner_user_id: ownerUserId,
      data: value as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict }
  );
  if (error) throw new Error(error.message);
}

// ============================================================================
// Voice notes — real files via Cloudinary, metadata in Supabase.
// ============================================================================

export interface VoiceNoteRow {
  id: string;
  memoryId: string;
  authorId: string;
  url: string;
  durationSec: number;
  mimeType: string;
  createdAt: string;
}

export async function fetchVoiceNotesRemote(supabase: SupabaseClient, memoryId: string): Promise<VoiceNoteRow[]> {
  const { data, error } = await supabase
    .from('voice_notes')
    .select('*')
    .eq('memory_id', memoryId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id,
    memoryId: r.memory_id,
    authorId: r.author_id,
    url: r.url,
    durationSec: Number(r.duration_sec),
    mimeType: r.mime_type,
    createdAt: r.created_at,
  }));
}

export async function createVoiceNoteRemote(
  supabase: SupabaseClient,
  memoryId: string,
  authorId: string,
  info: { url: string; cloudinaryPublicId?: string; durationSec: number; mimeType: string }
): Promise<VoiceNoteRow> {
  const { data, error } = await supabase
    .from('voice_notes')
    .insert({
      memory_id: memoryId,
      author_id: authorId,
      url: info.url,
      cloudinary_public_id: info.cloudinaryPublicId || null,
      duration_sec: info.durationSec,
      mime_type: info.mimeType,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    memoryId: data.memory_id,
    authorId: data.author_id,
    url: data.url,
    durationSec: Number(data.duration_sec),
    mimeType: data.mime_type,
    createdAt: data.created_at,
  };
}

export async function deleteVoiceNoteRemote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('voice_notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
