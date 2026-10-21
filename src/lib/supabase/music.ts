import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Couple songs — audio files on Cloudinary, metadata in Supabase.
// Backed by migration 15 (couple_songs + couples.current_song_id).
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

/** Newest first, so the most recent upload is what plays when nothing is pinned. */
export async function fetchSongsRemote(supabase: SupabaseClient, coupleId: string): Promise<CoupleSongRow[]> {
  const { data, error } = await supabase
    .from('couple_songs')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToSong);
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

/**
 * Pins (or unpins, with null) the couple's song. The FK is ON DELETE SET
 * NULL, so deleting the pinned song unpins it instead of failing here.
 */
export async function setCurrentSongRemote(
  supabase: SupabaseClient,
  coupleId: string,
  songId: string | null
): Promise<void> {
  const { error } = await supabase.from('couples').update({ current_song_id: songId }).eq('id', coupleId);
  if (error) throw new Error(error.message);
}

export async function fetchCurrentSongIdRemote(
  supabase: SupabaseClient,
  coupleId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('current_song_id')
    .eq('id', coupleId)
    .single();
  if (error) throw new Error(error.message);
  return (data as any)?.current_song_id ?? null;
}
