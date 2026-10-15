import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAppEnvironment } from '@/lib/env';

export async function getSupabaseServerClient() {
  const env = getAppEnvironment();
  if (!env.isSupabaseConfigured || !env.supabaseUrl || !env.supabaseKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Handled in middleware
        }
      },
    },
  });
}
