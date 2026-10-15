import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getAppEnvironment } from '@/lib/env';
import { z } from 'zod';

const registerMediaSchema = z.object({
  memoryId: z.string().uuid(),
  cloudinaryPublicId: z.string().min(1),
  cloudinaryAssetId: z.string().optional(),
  resourceType: z.enum(['image', 'video']).default('image'),
  caption: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const env = getAppEnvironment();
    if (!env.isSupabaseConfigured) {
      return NextResponse.json({
        mock: true,
        message: 'Running in demo mode; media record registered in client state.',
      });
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = registerMediaSchema.parse(body);

    // Insert into memory_media (protected by RLS)
    const { data, error } = await supabase
      .from('memory_media')
      .insert({
        memory_id: validated.memoryId,
        cloudinary_public_id: validated.cloudinaryPublicId,
        cloudinary_asset_id: validated.cloudinaryAssetId,
        resource_type: validated.resourceType,
        delivery_type: 'authenticated',
        caption: validated.caption,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, media: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to register media asset' },
      { status: 400 }
    );
  }
}
