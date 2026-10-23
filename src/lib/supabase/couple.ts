import type { SupabaseClient } from '@supabase/supabase-js';

export type SpaceKind = 'personal' | 'couple';

export type RemoteCouple = {
  id: string;
  name: string;
  relationship_start_date: string | null;
  anniversary_date: string | null;
  theme: string | null;
  invite_code: string;
  /** Added by migration 20; older rows read as 'couple' via its default. */
  kind?: SpaceKind | null;
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

/**
 * Creates a diary of either kind.
 *
 * Unlike the old create_couple_space, this really does create a new one each
 * time — an account may hold a personal diary and a couple space at once.
 * The one exception is a second personal diary, which the server returns the
 * existing one for: "a diary for one person" only means anything once.
 */
export async function createSpaceRemote(
  supabase: SupabaseClient,
  name: string,
  startDate: string,
  theme = 'candy',
  kind: SpaceKind = 'couple'
): Promise<RemoteCouple> {
  const { data, error } = await supabase.rpc('create_space', {
    p_name: name,
    p_start_date: startDate,
    p_theme: theme,
    p_kind: kind,
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

/**
 * Rotates the invite code. Creator-only, enforced in the database by both
 * the RPC and a trigger on `couples`, so a partner is refused even if they
 * call the table directly.
 *
 * Returns the code the server actually stored. The old client-side UPDATE
 * never checked its result and reported success regardless, which left the
 * screen showing a code the database had never seen.
 */
export async function regenerateInviteCodeRemote(
  supabase: SupabaseClient,
  coupleId: string
): Promise<RemoteCouple> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', { p_couple_id: coupleId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The server did not return a new invite code.');
  return data as RemoteCouple;
}

/**
 * Removes the other partner from the space. Creator-only.
 *
 * `rotateCode` defaults to true on purpose: the person being removed still
 * knows the current code, and the seat they just lost is now free, so
 * leaving the code alone lets them walk straight back in.
 */
export async function removePartnerRemote(
  supabase: SupabaseClient,
  coupleId: string,
  rotateCode = true
): Promise<RemoteCouple> {
  const { data, error } = await supabase.rpc('remove_partner', {
    p_couple_id: coupleId,
    p_rotate_code: rotateCode,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The server did not confirm the change.');
  return data as RemoteCouple;
}


/**
 * Every diary this account belongs to, oldest first.
 *
 * Replaces the single-space lookup at sign-in. The role comes from
 * couple_members rather than the space, because the same person can be the
 * creator of one diary and the partner in another.
 */
export async function fetchMySpacesRemote(
  supabase: SupabaseClient
): Promise<Array<{ couple: RemoteCouple; role: CoupleRole }>> {
  const { data, error } = await supabase
    .from('couple_members')
    .select('role, couples(*)')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (data || []) as Array<{ role: string; couples: RemoteCouple | RemoteCouple[] | null }>;
  return rows
    .map((row) => {
      const couple = Array.isArray(row.couples) ? row.couples[0] : row.couples;
      return couple ? { couple, role: (row.role === 'creator' ? 'creator' : 'partner') as CoupleRole } : null;
    })
    .filter((entry): entry is { couple: RemoteCouple; role: CoupleRole } => entry !== null);
}

/** Leaves a diary someone else created. The creator uses removePartner instead. */
export async function leaveSpaceRemote(supabase: SupabaseClient, coupleId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_space', { p_couple_id: coupleId });
  if (error) throw new Error(error.message);
}
