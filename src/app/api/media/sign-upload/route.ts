import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { generateUploadSignature } from '@/lib/cloudinary/server';
import { getAppEnvironment } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const env = getAppEnvironment();

    // In demo mode or if credentials are unconfigured:
    if (!env.isCloudinaryConfigured) {
      return NextResponse.json(
        {
          configured: false,
          message:
            'Cloudinary is not configured. Media can still be previewed locally using demo mode.',
        },
        { status: 503 }
      );
    }

    // Authenticate session if Supabase is connected
    let userId: string | null = null;
    let coupleId: string = 'demo_couple';

    if (env.isSupabaseConfigured) {
      const supabase = await getSupabaseServerClient();
      if (!supabase) {
        return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized: Please log in to upload media' }, { status: 401 });
      }

      userId = user.id;

      // Verify user's couple membership
      const { data: memberData, error: memberError } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', userId)
        .single();

      if (memberError || !memberData) {
        return NextResponse.json(
          { error: 'Forbidden: You must be an approved member of a couple space' },
          { status: 403 }
        );
      }

      coupleId = memberData.couple_id;
    }

    const body = await req.json().catch(() => ({}));
    const resourceType = body.resourceType === 'video' ? 'video' : 'image';
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = `ourdiary/${coupleId}`;

    const signatureData = generateUploadSignature({
      folder,
      timestamp,
      resourceType,
    });

    return NextResponse.json({
      configured: true,
      ...signatureData,
    });
  } catch (error: any) {
    console.error('Error generating upload signature:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to sign upload request' },
      { status: 500 }
    );
  }
}
