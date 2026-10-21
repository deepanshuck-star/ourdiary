import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Couple songs — audio files on Cloudinary, metadata in Supabase.
// Backed by couple_songs (migration 15), capped at one row per couple by
// migration 16 — replacing the song deletes the old row and its file.
// ============================================================================

export interface CoupleSongRow {
  id: string;
  coupleId: string;
  title: string;
  artist: string | null;
  url: string;
  durationSec: number | null;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

function rowToSong(r: any): CoupleSongRow {
  return {
    id: r.id,
    coupleId: r.couple_id,
    title: r.title,
    artist: r.artist,
    url: r.url,
    durationSec: r.duration_sec === null || r.duration_sec === undefined ? null : Number(r.duration_sec),
    mimeType: r.mime_type,
    uploadedBy: r.uploaded_by,
    createdAt: r.created_at,
  };
}

/**
 * The couple's one song, or null before they've set one. Migration 16 keeps
 * this to a single row per couple with a unique index; the ordering and
 * limit are belt-and-braces so a pre-migration database with leftovers
 * still returns the newest rather than an arbitrary row.
 */
export async function fetchSongRemote(
  supabase: SupabaseClient,
  coupleId: string
): Promise<CoupleSongRow | null> {
  const { data, error } = await supabase
    .from('couple_songs')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToSong(data) : null;
}

export async function createSongRemote(
  supabase: SupabaseClient,
  coupleId: string,
  uploadedBy: string,
  song: {
    title: string;
    artist?: string;
    url: string;
    cloudinaryPublicId?: string;
    durationSec?: number | null;
    mimeType: string;
  }
): Promise<CoupleSongRow> {
  const { data, error } = await supabase
    .from('couple_songs')
    .insert({
      couple_id: coupleId,
      title: song.title,
      artist: song.artist?.trim() || null,
      url: song.url,
      cloudinary_public_id: song.cloudinaryPublicId || null,
      duration_sec: song.durationSec ?? null,
      mime_type: song.mimeType,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToSong(data);
}

export async function updateSongRemote(
  supabase: SupabaseClient,
  id: string,
  updates: { title?: string; artist?: string | null }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.artist !== undefined) patch.artist = updates.artist?.trim() || null;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('couple_songs').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSongRemote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('couple_songs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
