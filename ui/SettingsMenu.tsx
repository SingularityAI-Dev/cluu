// ui/SettingsMenu.tsx
// D-06: persistent top-right settings affordance. Reachable from every screen —
// rendered on the landing page AND inside the Phaser canvas shell at /play.
// Phase 1: only "Sign out". Phase 3 will add Library, Wardrobe, Settings entries.
//
// Design note: the Sign out button lives inside a <form action={signOut}> so the
// submission flows through Plan 02's Server Action (which clears cookies and
// redirects). This keeps the UI free of client-side auth bookkeeping.
'use client';
import { useEffect, useRef, useState } from 'react';
import { signOut } from '@/app/auth/actions';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside + Escape: only subscribe while the menu is open.
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <button
        type="button"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          border: '1px solid #d9d6ce',
          background: '#fff',
          cursor: 'pointer',
          fontSize: '1.25rem',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {/* gear glyph; swap for an SVG icon in Phase 5 polish */}
        ⚙
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            minWidth: 180,
            padding: '0.5rem',
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #d9d6ce',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
