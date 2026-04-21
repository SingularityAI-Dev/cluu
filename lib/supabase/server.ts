// lib/supabase/server.ts
// Server-side Supabase client. Used by Server Components, Server Actions, Route Handlers.
// D-17: every consumer MUST call supabase.auth.getUser() — never the cached-session helper (ARCHITECTURE Anti-Pattern 5).
import 'server-only';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components cannot set cookies — but Server Actions and Route Handlers can.
          // Wrap in try/catch so Server Component callers don't crash (they just miss a refresh;
          // the proxy.ts refresh covers them on the next request).
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — ignore (proxy.ts handles refresh).
          }
        },
      },
    },
  );
}
