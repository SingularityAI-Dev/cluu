// app/auth/callback/route.ts
// AUTH-02 completion: magic-link redirect lands here with ?code=...
// We exchange the code for a session (which sets cookies via the server client)
// then redirect to /play.
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/play';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/signin?error=no_code', url.origin));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/auth/signin?error=exchange_failed', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
