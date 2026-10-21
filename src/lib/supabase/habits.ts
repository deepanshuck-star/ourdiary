import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Bad habits — a shared, playful list. Backed by migration 17.
// ============================================================================

export interface BadHabitRow {
  id: string;
  coupleId: string;
  aboutUserId: string;
  createdBy: string;
  title: string;
  note: string | null;
  severity: number;
  forgiven: boolean;
  createdAt: string;
}

function rowToHabit(r: any): BadHabitRow {
  return {
    id: r.id,
    coupleId: r.couple_id,
    aboutUserId: r.about_user_id,
    createdBy: r.created_by,
    title: r.title,
    note: r.note,
    severity: Number(r.severity),
    forgiven: Boolean(r.forgiven),
    createdAt: r.created_at,
  };
}

export async function fetchHabitsRemote(supabase: SupabaseClient, coupleId: string): Promise<BadHabitRow[]> {
  const { data, error } = await supabase
    .from('bad_habits')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToHabit);
}

export async function createHabitRemote(
  supabase: SupabaseClient,
  coupleId: string,
  createdBy: string,
  habit: { aboutUserId: string; title: string; note?: string; severity: number }
): Promise<BadHabitRow> {
  const { data, error } = await supabase
    .from('bad_habits')
    .insert({
      couple_id: coupleId,
      about_user_id: habit.aboutUserId,
      created_by: createdBy,
      title: habit.title,
      note: habit.note?.trim() || null,
      severity: habit.severity,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToHabit(data);
}

export async function updateHabitRemote(
  supabase: SupabaseClient,
  id: string,
  updates: { title?: string; note?: string | null; severity?: number; forgiven?: boolean }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.note !== undefined) patch.note = updates.note?.trim() || null;
  if (updates.severity !== undefined) patch.severity = updates.severity;
  if (updates.forgiven !== undefined) patch.forgiven = updates.forgiven;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('bad_habits').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteHabitRemote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('bad_habits').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
