import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  bytesToBase64,
  generateKeyBytes,
  masterKeyFrom,
  unwrapKey,
  wrapKey,
} from '@/lib/crypto/envelope';

// Hands a signed-in member their couple's data key, so their browser can
// encrypt photos before uploading them and decrypt them again to look at.
//
// The key lives in the database wrapped with the deployment's master key,
// which exists only in this process's environment. This route is the one
// place the two halves meet, which is why it does nothing else: authenticate,
// prove membership, unwrap, return.
//
// The key is never logged, never put in a URL, and never cached — see the
// no-store header below.

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    // A shared cache or a service worker holding a copy of this response
    // would be a copy of the key, which is the one thing we are protecting.
    headers: { 'Cache-Control': 'no-store, private' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const masterKey = await masterKeyFrom(process.env.OURDIARY_MASTER_KEY);
    // 200, not an error: encryption is optional, and the client falls back to
    // a plaintext upload cleanly. An error status here would look like a
    // broken deployment to every caller that has simply not opted in.
    if (!masterKey) return noStore({ configured: false });

    const supabase = await getSupabaseServerClient();
    if (!supabase) return noStore({ configured: false });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return noStore({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const coupleId = typeof body?.coupleId === 'string' ? body.coupleId.trim() : '';
    if (!coupleId) {
      return noStore({ error: 'A couple id is required.' }, 400);
    }

    // Plain select, not .single(): a user with rows for more than one couple
    // makes .single() error out, and membership is a question this code can
    // answer perfectly well on its own.
    const { data: memberships, error: memberError } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id);
    if (memberError) {
      return noStore({ error: 'Could not verify membership.' }, 500);
    }
    const isMember = (memberships ?? []).some(
      (row: { couple_id: string }) => row.couple_id === coupleId
    );
    if (!isMember) {
      return noStore({ error: 'Forbidden' }, 403);
    }

    const { data: rows, error: readError } = await supabase
      .from('couple_keys')
      .select('wrapped_key, wrap_iv')
      .eq('couple_id', coupleId)
      .limit(1);
    if (readError) {
      return noStore({ error: 'Could not read the couple key.' }, 500);
    }

    let wrapped = rows?.[0] as { wrapped_key: string; wrap_iv: string } | undefined;

    if (!wrapped) {
      // First upload this couple has ever made. Mint their key here rather
      // than at signup, so couples who never touch encryption never get one.
      const dataKey = generateKeyBytes();
      const sealed = await wrapKey(masterKey, dataKey);
      const { error: insertError } = await supabase.from('couple_keys').insert({
        couple_id: coupleId,
        wrapped_key: sealed.data,
        wrap_iv: sealed.iv,
      });

      if (!insertError) {
        return noStore({ configured: true, key: bytesToBase64(dataKey) });
      }

      // Both partners uploading at the same moment race for the primary key.
      // The loser must use the winner's key, not fail — two keys for one
      // couple would mean photos only one of them can open.
      const { data: retry } = await supabase
        .from('couple_keys')
        .select('wrapped_key, wrap_iv')
        .eq('couple_id', coupleId)
        .limit(1);
      wrapped = retry?.[0] as { wrapped_key: string; wrap_iv: string } | undefined;
      if (!wrapped) {
        return noStore({ error: 'Could not create the couple key.' }, 500);
      }
    }

    const raw = await unwrapKey(masterKey, { data: wrapped.wrapped_key, iv: wrapped.wrap_iv });
    return noStore({ configured: true, key: bytesToBase64(raw) });
  } catch (error: any) {
    // Deliberately only the message: anything wider risks a key or a
    // ciphertext ending up in a log aggregator.
    console.error('[OurDiary] Couple key request failed:', error?.message || 'unknown error');
    return noStore({ error: 'Could not provide the encryption key.' }, 500);
  }
}
