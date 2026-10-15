import { createBrowserClient } from '@supabase/ssr';
import { getAppEnvironment } from '@/lib/env';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  const env = getAppEnvironment();
  if (!env.isSupabaseConfigured || !env.supabaseUrl || !env.supabaseKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseKey);
  }

  return browserClient;
}
