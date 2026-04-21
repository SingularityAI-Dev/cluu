// app/play/CanvasSkeleton.tsx
// Loading placeholder shown for the ~100-300ms until Phaser hydrates (ARCHITECTURE Pattern 1).
export function CanvasSkeleton() {
  return (
    <div
      style={{
        width: 768,
        height: 576,
        maxWidth: '100%',
        margin: '2rem auto',
        background: '#e8f4d7',
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        color: '#4a5240',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span>Waking Cluu…</span>
    </div>
  );
}
