// game/index.ts
// The ONLY entry point from React into Phaser. app/play/GameClient.tsx is the ONLY consumer.
// D-08: single Phaser.Game per page mount. Cleanup runs game.destroy(true, false).
import Phaser from 'phaser';
import { buildConfig } from './config';

export interface GameInstance {
  game: Phaser.Game;
  destroy: () => void;
}

export function createGame(parent: HTMLElement): GameInstance {
  const config = buildConfig(parent);
  const game = new Phaser.Game(config);
  return {
    game,
    destroy: () => {
      // Pitfall 5 prevention #3: destroy(true) removes the canvas;
      // noReturn=false lets Phaser clean up cleanly.
      game.destroy(true, false);
    },
  };
}
