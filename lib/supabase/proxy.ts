// lib/supabase/proxy.ts
// D-27: renamed from the old middleware-style helper. Exports createProxyClient only.
// Consumed by the root proxy.ts. The response parameter is the MUTABLE response returned from the proxy
// — cookies set via `response.cookies.set(...)` here land on the response the browser receives (D-26).
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from './types';

export function createProxyClient(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // D-26 cookie-sync: set on the request AND on the mutable response.
          // If you skip the response write, refreshed cookies are lost and the known
          // Next 16 sign-out-loop bug fires.
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
}
