// app/auth/actions.ts
// Server Actions for auth flows. Plan 07 imports signOut into the SettingsMenu.
// AUTH-02 (signIn): Supabase magic-link via signInWithOtp.
// AUTH-05 (signOut): clears session; Plan 07 wires the UI.
'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const EmailSchema = z.string().email().max(254);

export async function signIn(formData: FormData) {
  const rawEmail = formData.get('email');
  const parsed = EmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    // Minimal: bounce back to signin. Phase 5 adds a flash-error UI.
    redirect('/auth/signin?error=invalid_email');
  }

  const supabase = await createServerClient();
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect('/auth/signin?error=send_failed');
  }

  redirect('/auth/signin?sent=1');
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/');
}
