// lib/supabase/client.ts
// Browser-side Supabase client. Used by Client Components only.
// Server paths use lib/supabase/server.ts; the proxy uses lib/supabase/proxy.ts.
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
