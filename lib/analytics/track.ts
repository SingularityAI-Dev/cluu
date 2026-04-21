// lib/analytics/track.ts
// Safe track() wrapper. No-op unless BOTH are true:
//   1. User has persisted consent=accepted
//   2. PostHogProvider has actually run posthog.init
// This is the Pitfall 12 blocker gate — callers never have to check consent themselves.
//
// Event-name allowlist: keeps the set of analytic events auditable. New event names
// must be added here before they can fire. This also prevents the CLAUDE.md rule
// "never log raw player prompts to analytics" from being accidentally violated —
// free-text fields do not appear in any schema below.

import posthog from 'posthog-js';
import { getConsent } from '@/lib/consent/store';
import { isInitialized } from './posthog-provider';

// Typed event map. Add new events here; compiler will block unknown event strings.
// NEVER put raw `prompt` text in a payload — only structural properties.
export type TrackEvent =
  | { name: 'game_started'; props?: { biome?: string } }
  | { name: 'encounter_opened'; props: { encounter_id: string } }
  | { name: 'encounter_attempt_submitted'; props: { encounter_id: string; attempt_number: number } }
  | { name: 'encounter_passed'; props: { encounter_id: string; attempt_number: number } }
  | { name: 'library_entry_saved'; props: { encounter_id: string } }
  | { name: 'library_exported'; props: { entry_count: number } }
  | { name: 'consent_accepted' }
  | { name: 'consent_declined' };

type EventByName<N extends TrackEvent['name']> = Extract<TrackEvent, { name: N }>;
type PropsByName<N extends TrackEvent['name']> = EventByName<N> extends { props: infer P }
  ? P
  : undefined;

/**
 * Type-safe analytics emitter. No-op until the user has explicitly consented.
 *
 * @example
 * track('encounter_opened', { encounter_id: 'meadow-01' });
 */
export function track<N extends TrackEvent['name']>(
  event: N,
  ...args: PropsByName<N> extends undefined ? [] : [props: PropsByName<N>]
): void {
  if (getConsent()?.decision !== 'accepted') return;
  if (!isInitialized()) return;
  const properties = (args[0] ?? undefined) as Record<string, unknown> | undefined;
  posthog.capture(event, properties);
}
