import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { deleteCloudinaryAsset } from '@/lib/cloudinary/server';
import { getAppEnvironment } from '@/lib/env';
import { isOwnedByCouple } from '@/lib/cloudinary/publicId';

const destroySchema = z.object({
  publicId: z.string().min(1),
  resourceType: z.enum(['image', 'video']).default('image'),
});

/**
 * Deletes one Cloudinary asset the caller's couple owns.
 *
 * Used when a stored file is being replaced rather than added to — the couple
 * song, a profile photo, the couple photo — so one couple's media doesn't
 * grow without bound.
 *
 * Authorization is the folder: /api/media/sign-upload only ever signs uploads
 * into `ourdiary/<coupleId>/`, so an id under the caller's own couple folder
 * is one they uploaded. Anything else is refused, which stops a caller from
 * passing an arbitrary id and wiping another couple's media.
 */
export async function POST(req: NextRequest) {
  try {
    const env = getAppEnvironment();
    if (!env.isCloudinaryConfigured) {
      // Demo mode keeps files on the device; nothing to destroy remotely.
      return NextResponse.json({ configured: false, deleted: false });
    }
    if (!env.isSupabaseConfigured) {
      // Without auth there is no couple to scope the delete to, so refuse
      // rather than accept an unauthenticated delete of any asset.
      return NextResponse.json({ error: 'Media deletion requires a signed-in couple space.' }, { status: 503 });
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member, error: memberError } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden: you are not in a couple space' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = destroySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!isOwnedByCouple(parsed.data.publicId, member.couple_id)) {
      return NextResponse.json({ error: 'Forbidden: that file is not yours' }, { status: 403 });
    }

    await deleteCloudinaryAsset(parsed.data.publicId, parsed.data.resourceType);
    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error('[OurDiary] Failed to destroy media asset:', error?.message);
    return NextResponse.json({ error: 'Failed to delete that file.' }, { status: 500 });
  }
}
