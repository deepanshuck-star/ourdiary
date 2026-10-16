import type { SupabaseClient } from '@supabase/supabase-js';

export type RemoteCouple = {
  id: string;
  name: string;
  relationship_start_date: string | null;
  anniversary_date: string | null;
  theme: string | null;
  invite_code: string;
};

export type CoupleRole = 'creator' | 'partner';

/**
 * Looks up the couple the signed-in user already belongs to.
 * Uses the oldest membership so duplicate rows can never hide an existing space.
 */
export async function fetchMyCouple(
  supabase: SupabaseClient
): Promise<{ couple: RemoteCouple; role: CoupleRole } | null> {
  const { data, error } = await supabase
    .from('couple_members')
    .select('role, couples(*)')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = data?.[0] as { role: string; couples: RemoteCouple | RemoteCouple[] | null } | undefined;
  const couple = Array.isArray(row?.couples) ? row?.couples[0] : row?.couples;
  if (!row || !couple) return null;
  return { couple, role: row.role === 'creator' ? 'creator' : 'partner' };
}

/** Creates a couple space (or returns the user's existing one) atomically on the server. */
export async function createCoupleSpaceRemote(
  supabase: SupabaseClient,
  name: string,
  startDate: string,
  theme = 'candy'
): Promise<RemoteCouple> {
  const { data, error } = await supabase.rpc('create_couple_space', {
    p_name: name,
    p_start_date: startDate,
    p_theme: theme,
  });
  if (error) throw new Error(error.message);
  return data as RemoteCouple;
}

/** Joins a couple space by invite code atomically on the server. */
export async function joinCoupleByCodeRemote(
  supabase: SupabaseClient,
  code: string
): Promise<RemoteCouple> {
  const { data, error } = await supabase.rpc('join_couple_by_code', { code });
  if (error) throw new Error(error.message);
  return data as RemoteCouple;
}
