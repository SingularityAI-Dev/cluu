// app/auth/signin/page.tsx
// AUTH-02: magic-link sign-in. Phase 5 polishes.
// Uses the signIn Server Action from app/auth/actions.ts.
import { signIn } from '../actions';

export default function SignInPage() {
  return (
    <main
      style={{
        maxWidth: 420,
        margin: '4rem auto',
        padding: '2rem 1.5rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ margin: 0, marginBottom: '0.75rem' }}>Save your island</h1>
      <p style={{ margin: 0, marginBottom: '0.5rem', color: '#555' }}>
        Enter your email. We&apos;ll send you a link.
      </p>
      <p style={{ margin: 0, marginBottom: '1.5rem', color: '#777', fontSize: '0.85rem' }}>
        No password. Nothing else.
      </p>
      <form action={signIn} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          style={{
            padding: '0.75rem 0.875rem',
            fontSize: '1rem',
            borderRadius: 8,
            border: '1px solid #d9d6ce',
            background: '#fff',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.75rem 1rem',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: 8,
            border: 'none',
            background: '#2d6a4f',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Send link
        </button>
      </form>
    </main>
  );
}
