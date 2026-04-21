// game/systems/follow.ts
// D-11: Cluu seek behavior — constant speed toward target, stops at 24px radius.
// Pure function so it's trivially testable in isolation (no Phaser needed).

export const STOP_RADIUS = 24;

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Compute desired velocity for a seek behavior.
 * @param from Current position
 * @param to Target position
 * @param speed Pixels per second
 * @returns velocity in px/s; {0, 0} when within STOP_RADIUS (inclusive)
 */
export function seekTarget(from: Vec2, to: Vec2, speed: number): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= STOP_RADIUS) return { x: 0, y: 0 };
  return { x: (dx / dist) * speed, y: (dy / dist) * speed };
}
