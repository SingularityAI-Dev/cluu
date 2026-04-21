// state/StoreProvider.tsx
// React Context that instantiates the game store once per mount (per-request on the server
// when rendered server-side; per-client-mount when hydrated in the browser).
// D-15 + STACK.md "Integration gotchas §7": never use a module-level singleton.
'use client';
import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  createGameStore,
  type GameState,
  type GameStore,
  type GameStoreApi,
} from './gameStore';

const GameStoreContext = createContext<GameStoreApi | null>(null);

export function StoreProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: Partial<GameState>;
}) {
  const storeRef = useRef<GameStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createGameStore(initialState);
  }
  return (
    <GameStoreContext.Provider value={storeRef.current}>
      {children}
    </GameStoreContext.Provider>
  );
}

export function useGameStore<T>(selector: (s: GameStore) => T): T {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error('useGameStore must be used within a StoreProvider');
  return useStore(store, selector);
}
