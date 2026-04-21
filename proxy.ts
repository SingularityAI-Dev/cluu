// proxy.ts (root)
// D-25: Next 16 file is proxy.ts (NOT middleware.ts). Function exported is `proxy` (NOT `middleware`).
// D-26: mutable response + explicit cookie sync prevents the known sign-out-loop bug.
// D-17: calls supabase.auth.getUser() — never the cached-session read helper.
//
// Sentry wiring for this proxy runs in Plan 06 via Sentry.captureRequestError / instrumentation.ts.
import { NextResponse, type NextRequest } from 'next/server';
import { createProxyClient } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  // Mutable response that will receive refreshed cookies (D-26 step 1).
  const response = NextResponse.next({ request });

  const supabase = createProxyClient(request, response);

  // Trigger the session refresh. createProxyClient's setAll callback writes refreshed
  // cookies to `response.cookies` — which is why `response` MUST be the same instance
  // passed into createProxyClient (D-26 rationale).
  // D-17: getUser re-validates with the Supabase auth server; the cached helper would only read the cookie locally.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skip static assets + the favicon; run on everything else (including /api/* and /auth/*).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sprites/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
