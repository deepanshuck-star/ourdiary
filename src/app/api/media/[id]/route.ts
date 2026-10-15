import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { deleteCloudinaryAsset } from '@/lib/cloudinary/server';
import { getAppEnvironment } from '@/lib/env';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const env = getAppEnvironment();

    if (!env.isSupabaseConfigured) {
      return NextResponse.json({ success: true, mock: true });
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve media record (guarded by RLS)
    const { data: media, error: selectError } = await supabase
      .from('memory_media')
      .select('id, cloudinary_public_id, resource_type, memory_id')
      .eq('id', id)
      .single();

    if (selectError || !media) {
      return NextResponse.json({ error: 'Media not found or access denied' }, { status: 404 });
    }

    // Delete from Cloudinary if configured
    if (env.isCloudinaryConfigured && media.cloudinary_public_id) {
      try {
        await deleteCloudinaryAsset(
          media.cloudinary_public_id,
          media.resource_type as 'image' | 'video'
        );
      } catch (cloudErr) {
        console.warn('Failed to delete asset from Cloudinary:', cloudErr);
      }
    }

    // Delete record from Supabase
    const { error: deleteError } = await supabase
      .from('memory_media')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Delete operation failed' }, { status: 500 });
  }
}
