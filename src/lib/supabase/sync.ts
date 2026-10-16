import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CalendarEvent,
  Letter,
  BucketItem,
  LoveCoupon,
  WheelOption,
  DailySparkAnswer,
  MemoryNote,
  MemoryPhoto,
  ProfileId,
} from '@/types';

/** Flips the app's local user_1/user_2 label to the "other" one. */
function otherOf(id: ProfileId): ProfileId {
  return id === 'user_1' ? 'user_2' : 'user_1';
}
/** Labels a row's owner column against the signed-in user: mine vs. partner's slot. */
function labelOwner(ownerId: string | null, myUserId: string, myProfileId: ProfileId): ProfileId {
  return ownerId === myUserId ? myProfileId : otherOf(myProfileId);
}

// ---------------------------------------------------------------- Events ---
export async function fetchEventsRemote(
  supabase: SupabaseClient,
  coupleId: string
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('events').select('*').eq('couple_id', coupleId).order('event_date');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    date: r.event_date,
    time: r.event_time || undefined,
    category: r.category || 'Other',
    description: r.description || undefined,
    memoryId: r.memory_id || undefined,
  }));
}
export async function createEventRemote(
  supabase: SupabaseClient,
  coupleId: string,
  authorId: string,
  event: Omit<CalendarEvent, 'id'>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      couple_id: coupleId,
      title: event.title,
      event_date: event.date,
      event_time: event.time || null,
      category: event.category,
      description: event.description || null,
      memory_id: event.memoryId || null,
      created_by: authorId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...event, id: data.id };
}
export async function updateEventRemote(supabase: SupabaseClient, id: string, updates: Partial<CalendarEvent>) {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.date !== undefined) patch.event_date = updates.date;
  if (updates.time !== undefined) patch.event_time = updates.time || null;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.description !== undefined) patch.description = updates.description || null;
  if (updates.memoryId !== undefined) patch.memory_id = updates.memoryId || null;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('events').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteEventRemote(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// --------------------------------------------------------------- Letters ---
export async function fetchLettersRemote(
  supabase: SupabaseClient,
  coupleId: string,
  myUserId: string,
  myProfileId: ProfileId
): Promise<Letter[]> {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    fromId: labelOwner(r.author_id, myUserId, myProfileId),
    toId: r.recipient_id ? labelOwner(r.recipient_id, myUserId, myProfileId) : otherOf(myProfileId),
    content: r.content,
    createdAt: r.created_at,
    unlockDate: r.unlock_at ? r.unlock_at.split('T')[0] : '',
    isDraft: r.status === 'draft',
    readAt: r.read_at || undefined,
    envelopeColor: r.envelope_color || undefined,
  }));
}
export async function createLetterRemote(
  supabase: SupabaseClient,
  coupleId: string,
  authorId: string,
  recipientId: string | null,
  letter: Omit<Letter, 'id' | 'createdAt'>
): Promise<Letter> {
  const { data, error } = await supabase
    .from('letters')
    .insert({
      couple_id: coupleId,
      author_id: authorId,
      recipient_id: recipientId,
      title: letter.title,
      content: letter.content,
      status: letter.isDraft ? 'draft' : 'sealed',
      unlock_at: letter.unlockDate ? new Date(letter.unlockDate).toISOString() : null,
      envelope_color: letter.envelopeColor || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...letter, id: data.id, createdAt: data.created_at };
}
export async function updateLetterRemote(supabase: SupabaseClient, id: string, updates: Partial<Letter>) {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.content !== undefined) patch.content = updates.content;
  if (updates.isDraft !== undefined) patch.status = updates.isDraft ? 'draft' : 'sealed';
  if (updates.unlockDate !== undefined) patch.unlock_at = updates.unlockDate ? new Date(updates.unlockDate).toISOString() : null;
  if (updates.readAt !== undefined) patch.read_at = updates.readAt || null;
  if (updates.envelopeColor !== undefined) patch.envelope_color = updates.envelopeColor || null;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('letters').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteLetterRemote(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('letters').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------- Bucket list ---
export async function fetchBucketListRemote(
  supabase: SupabaseClient,
  coupleId: string,
  myUserId: string,
  myProfileId: ProfileId
): Promise<BucketItem[]> {
  const { data, error } = await supabase
    .from('bucket_items')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    category: r.category || 'Milestones',
    completed: r.is_completed,
    completedDate: r.completed_at ? r.completed_at.split('T')[0] : undefined,
    targetDate: r.target_date || undefined,
    notes: r.notes || undefined,
    createdBy: labelOwner(r.created_by, myUserId, myProfileId),
    memoryId: r.memory_id || undefined,
  }));
}
export async function createBucketItemRemote(
  supabase: SupabaseClient,
  coupleId: string,
  authorId: string,
  item: Omit<BucketItem, 'id'>
): Promise<BucketItem> {
  const { data, error } = await supabase
    .from('bucket_items')
    .insert({
      couple_id: coupleId,
      title: item.title,
      category: item.category,
      is_completed: item.completed,
      completed_at: item.completedDate ? new Date(item.completedDate).toISOString() : null,
      target_date: item.targetDate || null,
      notes: item.notes || null,
      memory_id: item.memoryId || null,
      created_by: authorId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...item, id: data.id };
}
export async function updateBucketItemRemote(supabase: SupabaseClient, id: string, updates: Partial<BucketItem>) {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.completed !== undefined) patch.is_completed = updates.completed;
  if (updates.completedDate !== undefined) patch.completed_at = updates.completedDate ? new Date(updates.completedDate).toISOString() : null;
  if (updates.targetDate !== undefined) patch.target_date = updates.targetDate || null;
  if (updates.notes !== undefined) patch.notes = updates.notes || null;
  if (updates.memoryId !== undefined) patch.memory_id = updates.memoryId || null;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('bucket_items').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteBucketItemRemote(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('bucket_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------- Love coupons ---
export async function fetchLoveCouponsRemote(
  supabase: SupabaseClient,
  coupleId: string,
  myUserId: string,
  myProfileId: ProfileId
): Promise<LoveCoupon[]> {
  const { data, error } = await supabase
    .from('love_coupons')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description || '',
    category: r.category || 'Love',
    fromId: labelOwner(r.from_user, myUserId, myProfileId),
    toId: labelOwner(r.to_user, myUserId, myProfileId),
    redeemed: r.redeemed,
    redeemedAt: r.redeemed_at ? r.redeemed_at.split('T')[0] : undefined,
  }));
}
export async function createLoveCouponRemote(
  supabase: SupabaseClient,
  coupleId: string,
  fromUserId: string,
  toUserId: string | null,
  coupon: Omit<LoveCoupon, 'id' | 'redeemed' | 'redeemedAt'>
): Promise<LoveCoupon> {
  const { data, error } = await supabase
    .from('love_coupons')
    .insert({
      couple_id: coupleId,
      title: coupon.title,
      description: coupon.description,
      category: coupon.category,
      from_user: fromUserId,
      to_user: toUserId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...coupon, id: data.id, redeemed: false };
}
export async function redeemLoveCouponRemote(supabase: SupabaseClient, id: string, redeemedAt: string) {
  const { error } = await supabase
    .from('love_coupons')
    .update({ redeemed: true, redeemed_at: new Date(redeemedAt).toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ------------------------------------------------------ Spin wheel opts ---
export async function fetchWheelOptionsRemote(supabase: SupabaseClient, coupleId: string): Promise<WheelOption[]> {
  const { data, error } = await supabase.from('spin_wheel_options').select('*').eq('couple_id', coupleId);
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ id: r.id, text: r.text, category: r.category }));
}
export async function createWheelOptionRemote(
  supabase: SupabaseClient,
  coupleId: string,
  option: WheelOption
): Promise<WheelOption> {
  const { data, error } = await supabase
    .from('spin_wheel_options')
    .insert({ couple_id: coupleId, text: option.text, category: option.category })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...option, id: data.id };
}
export async function deleteWheelOptionRemote(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('spin_wheel_options').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------- Daily spark ---
export async function fetchDailySparkAnswersRemote(
  supabase: SupabaseClient,
  coupleId: string,
  myUserId: string,
  myProfileId: ProfileId
): Promise<DailySparkAnswer[]> {
  const { data, error } = await supabase
    .from('daily_spark_answers')
    .select('*')
    .eq('couple_id', coupleId)
    .order('answer_date', { ascending: false });
  if (error) throw new Error(error.message);

  const byKey = new Map<string, DailySparkAnswer>();
  for (const r of data || []) {
    const key = `${r.question_id}__${r.answer_date}`;
    const who = labelOwner(r.user_id, myUserId, myProfileId);
    const existing: DailySparkAnswer = byKey.get(key) || {
      questionId: r.question_id,
      question: r.question_text,
      date: r.answer_date,
      answers: {},
    };
    existing.answers[who] = { content: r.content, answeredAt: r.answered_at };
    byKey.set(key, existing);
  }
  return Array.from(byKey.values());
}
export async function upsertDailySparkAnswerRemote(
  supabase: SupabaseClient,
  coupleId: string,
  userId: string,
  questionId: string,
  questionText: string,
  date: string,
  content: string
) {
  const { error } = await supabase
    .from('daily_spark_answers')
    .upsert(
      {
        couple_id: coupleId,
        question_id: questionId,
        question_text: questionText,
        answer_date: date,
        user_id: userId,
        content,
      },
      { onConflict: 'couple_id,question_id,answer_date,user_id' }
    );
  if (error) throw new Error(error.message);
}

// ------------------------------------------------------------ Mem. notes ---
export async function fetchMemoryNotesRemote(
  supabase: SupabaseClient,
  memoryId: string,
  myUserId: string,
  myProfileId: ProfileId
): Promise<MemoryNote[]> {
  const { data, error } = await supabase.from('memory_notes').select('*').eq('memory_id', memoryId);
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id,
    memoryId: r.memory_id,
    authorId: labelOwner(r.author_id, myUserId, myProfileId),
    authorName: '',
    content: r.content,
    visibility: r.visibility,
    createdAt: r.created_at,
  }));
}
export async function createMemoryNoteRemote(
  supabase: SupabaseClient,
  authorId: string,
  note: Omit<MemoryNote, 'id' | 'createdAt' | 'authorId' | 'authorName'>
): Promise<MemoryNote> {
  const { data, error } = await supabase
    .from('memory_notes')
    .insert({
      memory_id: note.memoryId,
      author_id: authorId,
      content: note.content,
      visibility: note.visibility,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    ...note,
    id: data.id,
    authorId: 'user_1',
    authorName: '',
    createdAt: data.created_at,
  };
}
export async function updateMemoryNoteRemote(
  supabase: SupabaseClient,
  id: string,
  updates: { content?: string; visibility?: 'shared' | 'private' }
) {
  const patch: Record<string, unknown> = {};
  if (updates.content !== undefined) patch.content = updates.content;
  if (updates.visibility !== undefined) patch.visibility = updates.visibility;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('memory_notes').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteMemoryNoteRemote(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('memory_notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Bulk fetch of notes for every memory in a couple (avoids one query per memory). */
export async function fetchMemoryNotesForMemoriesRemote(
  supabase: SupabaseClient,
  memoryIds: string[],
  myUserId: string,
  myProfileId: ProfileId
): Promise<Map<string, MemoryNote[]>> {
  const byMemory = new Map<string, MemoryNote[]>();
  if (memoryIds.length === 0) return byMemory;
  const { data, error } = await supabase.from('memory_notes').select('*').in('memory_id', memoryIds);
  if (error) throw new Error(error.message);
  for (const r of data || []) {
    const note: MemoryNote = {
      id: r.id,
      memoryId: r.memory_id,
      authorId: labelOwner(r.author_id, myUserId, myProfileId),
      authorName: '',
      content: r.content,
      visibility: r.visibility,
      createdAt: r.created_at,
    };
    const list = byMemory.get(r.memory_id) || [];
    list.push(note);
    byMemory.set(r.memory_id, list);
  }
  return byMemory;
}

// ----------------------------------------------------------- Mem. photos ---
export async function fetchMemoryPhotosRemote(supabase: SupabaseClient, memoryId: string): Promise<MemoryPhoto[]> {
  const { data, error } = await supabase
    .from('memory_photos')
    .select('*')
    .eq('memory_id', memoryId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ id: r.id, url: r.url, caption: r.caption || undefined, dateAdded: r.created_at }));
}
export async function createMemoryPhotoRemote(
  supabase: SupabaseClient,
  memoryId: string,
  photo: { url: string; caption?: string }
): Promise<MemoryPhoto> {
  const { data, error } = await supabase
    .from('memory_photos')
    .insert({ memory_id: memoryId, url: photo.url, caption: photo.caption || null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, url: data.url, caption: data.caption || undefined, dateAdded: data.created_at };
}
export async function deleteMemoryPhotoRemote(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('memory_photos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Bulk fetch of photos for every memory in a couple. */
export async function fetchMemoryPhotosForMemoriesRemote(
  supabase: SupabaseClient,
  memoryIds: string[]
): Promise<Map<string, MemoryPhoto[]>> {
  const byMemory = new Map<string, MemoryPhoto[]>();
  if (memoryIds.length === 0) return byMemory;
  const { data, error } = await supabase
    .from('memory_photos')
    .select('*')
    .in('memory_id', memoryIds)
    .order('created_at');
  if (error) throw new Error(error.message);
  for (const r of data || []) {
    const photo: MemoryPhoto = { id: r.id, url: r.url, caption: r.caption || undefined, dateAdded: r.created_at };
    const list = byMemory.get(r.memory_id) || [];
    list.push(photo);
    byMemory.set(r.memory_id, list);
  }
  return byMemory;
}
