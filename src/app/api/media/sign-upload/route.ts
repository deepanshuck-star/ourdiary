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

    const body = await req.json().catch(() => ({}));
    const requestedCoupleId = typeof body.coupleId === 'string' ? body.coupleId : null;

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

      // An account can hold a personal diary and a couple space at once
      // (migration 20), so the caller names the one they are uploading for
      // and we prove they belong to it. This used to be a .single() over the
      // caller's memberships, which errors outright on a second row — every
      // upload would have failed the moment someone had two diaries.
      const memberships = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', userId);

      if (memberships.error) {
        return NextResponse.json({ error: 'Could not verify your diary membership' }, { status: 500 });
      }

      const mine = (memberships.data || []).map((row: { couple_id: string }) => row.couple_id);

      if (requestedCoupleId) {
        if (!mine.includes(requestedCoupleId)) {
          return NextResponse.json(
            { error: 'Forbidden: that diary is not yours' },
            { status: 403 }
          );
        }
        coupleId = requestedCoupleId;
      } else if (mine.length === 1) {
        // An older client that doesn't name the space, with nothing ambiguous
        // about which one it meant.
        coupleId = mine[0];
      } else if (mine.length === 0) {
        return NextResponse.json(
          { error: 'Forbidden: You must be an approved member of a couple space' },
          { status: 403 }
        );
      } else {
        // Guessing here is what put files in the wrong diary; make the client
        // say which one instead.
        return NextResponse.json(
          { error: 'Which diary is this for? Reopen the diary and try again.' },
          { status: 400 }
        );
      }
    }

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
