import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileId } from '@/types';

function otherOf(id: ProfileId): ProfileId {
  return id === 'user_1' ? 'user_2' : 'user_1';
}

/** Fetches both couple members' display names + avatar URLs, labeled by app profile slot. */
export async function fetchCoupleProfilesRemote(
  supabase: SupabaseClient,
  coupleId: string,
  myUserId: string,
  myProfileId: ProfileId
): Promise<Partial<Record<ProfileId, { name?: string; avatarUrl?: string }>>> {
  let data: any[] | null = null;
  const primaryQuery = await supabase
    .from('couple_members')
    .select('user_id, profiles(display_name, avatar_url)')
    .eq('couple_id', coupleId);

  if (primaryQuery.error) {
    // Graceful fallback if avatar_url has not been added to profiles table yet
    const fallbackQuery = await supabase
      .from('couple_members')
      .select('user_id, profiles(display_name)')
      .eq('couple_id', coupleId);
    if (fallbackQuery.error) {
      console.warn('Could not fetch couple member profiles:', fallbackQuery.error.message);
      return {};
    }
    data = fallbackQuery.data;
  } else {
    data = primaryQuery.data;
  }

  const result: Partial<Record<ProfileId, { name?: string; avatarUrl?: string }>> = {};
  for (const row of (data || []) as any[]) {
    const slot: ProfileId = row.user_id === myUserId ? myProfileId : otherOf(myProfileId);
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    result[slot] = { name: profile?.display_name, avatarUrl: profile?.avatar_url };
  }
  return result;
}

/** Updates the signed-in user's own avatar. RLS restricts this to your own profile row. */
export async function updateMyAvatarRemote(supabase: SupabaseClient, userId: string, avatarUrl: string) {
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
  if (error) throw new Error(error.message);
}

/** Updates the shared couple photo. RLS allows either couple member. */
export async function updateCouplePhotoRemote(supabase: SupabaseClient, coupleId: string, photoUrl: string) {
  const { error } = await supabase.from('couples').update({ photo_url: photoUrl }).eq('id', coupleId);
  if (error) throw new Error(error.message);
}

/**
 * Both partners' auth user ids, labelled relative to the caller. Features
 * that record a direction between the two people (gifts, whose habit it is)
 * need the partner's real id, which the profile-slot mapping above hides.
 *
 * `partner` is null until the second partner has joined the space.
 */
export async function fetchCoupleMemberIdsRemote(
  supabase: SupabaseClient,
  coupleId: string,
  myUserId: string
): Promise<{ me: string; partner: string | null }> {
  const { data, error } = await supabase.from('couple_members').select('user_id').eq('couple_id', coupleId);
  if (error) throw new Error(error.message);
  const ids = (data || []).map((r: any) => r.user_id as string);
  return { me: myUserId, partner: ids.find((id) => id !== myUserId) ?? null };
}
