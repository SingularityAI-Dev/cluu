// app/page.tsx
// D-06: the settings affordance is reachable from every screen — including the
// landing page — so an already-signed-in user can sign out without entering /play.
import { SettingsMenu } from '@/ui/SettingsMenu';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <SettingsMenu />
      <h1>Cluu</h1>
      <p>
        <a href="/play">Start playing</a>
      </p>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <a href="/auth/signin">Already signed in? Sign in to save.</a>
      </p>
    </main>
  );
}
