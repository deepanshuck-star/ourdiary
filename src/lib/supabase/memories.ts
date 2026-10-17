import type { SupabaseClient } from '@supabase/supabase-js';
import type { Memory, ProfileId } from '@/types';

type MemoryRow = {
  id: string;
  couple_id: string;
  memory_date: string;
  title: string;
  story: string | null;
  mood: string | null;
  category: string | null;
  location: string | null;
  perspective_user1: string | null;
  perspective_user2: string | null;
  tags: string[] | null;
  created_by: string | null;
};

/** Maps a memories DB row to the app's Memory shape (photos/reactions/notes loaded separately). */
function rowToMemory(row: MemoryRow, createdByProfile: ProfileId): Memory {
  return {
    id: row.id,
    title: row.title,
    date: row.memory_date,
    description: row.story || '',
    mood: (row.mood as Memory['mood']) || 'happy',
    category: (row.category as Memory['category']) || 'Other',
    location: row.location || '',
    photos: [],
    tags: row.tags || [],
    createdBy: createdByProfile,
    perspectives: {
      user_1: row.perspective_user1 || undefined,
      user_2: row.perspective_user2 || undefined,
    },
    reactions: [],
    notes: [],
  };
}

/**
 * Fetches all memories for a couple, newest first. `myUserId`/`myProfileId`
 * identify the caller, so each row can be labeled with the app's user_1/
 * user_2 profile slot: rows authored by the caller get the caller's own
 * slot, everything else gets the other partner's slot (there are only ever
 * two couple members, so this is unambiguous without a separate lookup).
 */
export async function fetchMemoriesRemote(
  supabase: SupabaseClient,
  coupleId: string,
  myUserId: string,
  myProfileId: ProfileId
): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('couple_id', coupleId)
    .order('memory_date', { ascending: false });

  if (error) throw new Error(error.message);
  const otherProfileId: ProfileId = myProfileId === 'user_1' ? 'user_2' : 'user_1';
  return (data || []).map((row: MemoryRow) =>
    rowToMemory(row, row.created_by === myUserId ? myProfileId : otherProfileId)
  );
}

export async function createMemoryRemote(
  supabase: SupabaseClient,
  coupleId: string,
  authorId: string,
  memory: Omit<Memory, 'id' | 'reactions' | 'notes'>
): Promise<Memory> {
  // Note: the author's profiles row is guaranteed to already exist by this
  // point — create_couple_space()/join_couple_by_code() (migration 06/07)
  // create it before a user can ever reach a couple space at all, and
  // `profiles` has no INSERT policy for a client-side upsert to use anyway.
  // An upsert here would silently no-op (or be rejected by RLS) either way.
  const { data, error } = await supabase
    .from('memories')
    .insert({
      couple_id: coupleId,
      memory_date: memory.date,
      title: memory.title,
      story: memory.description,
      mood: memory.mood,
      category: memory.category,
      location: memory.location,
      perspective_user1: memory.perspectives?.user_1 || null,
      perspective_user2: memory.perspectives?.user_2 || null,
      tags: memory.tags || [],
      created_by: authorId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // If memory includes photos, persist them to memory_photos too. A failure
  // here must not be swallowed: the memory itself still saved, but the
  // caller needs to know its photos didn't, so it can tell the user instead
  // of claiming a full, silent success.
  let savedPhotos: Memory['photos'] = [];
  if (memory.photos && memory.photos.length > 0) {
    const photoInserts = memory.photos.map((p) => ({
      memory_id: data.id,
      url: p.url,
      caption: p.caption || null,
    }));
    const { data: photoRows, error: photoError } = await supabase
      .from('memory_photos')
      .insert(photoInserts)
      .select();
    if (photoError) {
      console.error('[OurDiary] Memory saved, but its photos failed to save:', photoError.message);
    } else {
      savedPhotos = (photoRows || []).map((r: any) => ({
        id: r.id,
        url: r.url,
        caption: r.caption || undefined,
        dateAdded: r.created_at,
      }));
    }
  }

  return {
    ...rowToMemory(data as MemoryRow, memory.createdBy),
    photos: savedPhotos,
  };
}

export async function updateMemoryRemote(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Memory>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.date !== undefined) patch.memory_date = updates.date;
  if (updates.description !== undefined) patch.story = updates.description;
  if (updates.mood !== undefined) patch.mood = updates.mood;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.location !== undefined) patch.location = updates.location;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  if (updates.perspectives !== undefined) {
    patch.perspective_user1 = updates.perspectives.user_1 || null;
    patch.perspective_user2 = updates.perspectives.user_2 || null;
  }
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from('memories').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteMemoryRemote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('memories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
