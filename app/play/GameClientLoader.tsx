// app/play/GameClientLoader.tsx
// Client-Component shim that holds next/dynamic({ ssr: false }). Next 16 forbids ssr:false
// inside Server Components, so the Server page (page.tsx) reads the user then renders THIS
// component, which owns the dynamic Phaser import.
'use client';
import dynamic from 'next/dynamic';
import { CanvasSkeleton } from './CanvasSkeleton';

// D-09: ssr:false keeps Phaser out of the server bundle entirely. Pitfall 5 absorbed here.
const GameClient = dynamic(() => import('./GameClient'), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

interface GameClientLoaderProps {
  userId: string | null;
  isAnonymous: boolean;
}

export function GameClientLoader(props: GameClientLoaderProps) {
  return <GameClient {...props} />;
}
