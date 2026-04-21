// app/global-error.tsx
// D-21: root error boundary — uncaught render errors flow to Sentry.
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>We've logged it. Try again.</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2d6a4f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
