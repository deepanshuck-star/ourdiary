import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getAppEnvironment } from '@/lib/env';

/**
 * Keeps the Supabase auth cookie fresh on every request.
 *
 * `createBrowserClient` stores the session in cookies, and refreshes the
 * access token in the browser while the app is open. Nothing was refreshing
 * it server-side, so a route handler could read a cookie the browser hadn't
 * got round to renewing yet and reject a perfectly valid session — the
 * "Unauthorized: Please log in to upload media" you'd get on the first
 * upload after leaving the app alone for a while.
 *
 * Calling getUser() here does the refresh and writes the new cookie back on
 * the response, so the server and the browser never disagree about whether
 * you're signed in.
 *
 * `src/lib/supabase/server.ts` has always assumed this file existed — its
 * cookie-write catch block is commented "Handled in middleware". Next 16
 * renamed that convention from `middleware` to `proxy`, which is why this
 * is `proxy.ts`.
 */
export async function proxy(request: NextRequest) {
  const env = getAppEnvironment();
  // Demo mode: no Supabase, no session, nothing to refresh.
  if (!env.isSupabaseConfigured || !env.supabaseUrl || !env.supabaseKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Both halves matter. The request copy lets anything rendered
        // downstream in this same pass see the refreshed token; the response
        // copy is what actually reaches the browser.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Nothing may go between creating the client and this call: it is what
  // triggers the refresh, and any early return in between would drop the
  // refreshed cookie on the floor.
  try {
    await supabase.auth.getUser();
  } catch {
    // A network blip reaching Supabase must not take the whole page down.
    // The session is untouched; the next request tries again.
  }

  // Must be this exact response object. Building a fresh one here would
  // discard the Set-Cookie headers written above, and the session would
  // silently stop refreshing — the failure mode being an apparently random
  // logout days later.
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except the things that never carry a session:
     * - _next/static, _next/image: build output
     * - favicon, manifest, sw.js, robots, sitemap: static metadata
     * - image and font files anywhere
     *
     * Without a matcher this runs on every asset request too, which would
     * mean a Supabase round trip per image.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
