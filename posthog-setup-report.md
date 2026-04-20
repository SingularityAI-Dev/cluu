<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the Cluu Next.js App Router project. The following files were created to establish the foundation for analytics, error tracking, and server-side event capture:

- **`instrumentation-client.ts`** — Initializes `posthog-js` client-side using Next.js 15.3+ instrumentation hooks. Configured for the EU PostHog host via a reverse proxy (`/ingest`), with `capture_exceptions: true` for automatic error tracking and `defaults: '2026-01-30'`.
- **`next.config.ts`** — Adds `/ingest/static/*`, `/ingest/array/*`, and `/ingest/*` reverse proxy rewrites routing to `eu-assets.i.posthog.com` and `eu.i.posthog.com`, plus `skipTrailingSlashRedirect: true` for PostHog API compatibility.
- **`src/lib/posthog-server.ts`** — Singleton server-side PostHog client (`posthog-node`) for use in API route handlers and Server Actions, flushing immediately on every event (`flushAt: 1`, `flushInterval: 0`).
- **`.env.local`** — `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` set with correct EU values.

Packages to install when `package.json` is created (Phase 01-01): `posthog-js`, `posthog-node`.

## Planned events

> Note: The project is in early scaffolding — no `app/` source files exist yet. `posthog.capture()` calls should be added to the files below as they are created during Phase 1 development. Event names are snake_case to match PostHog conventions.

| Event name | Description | File | Side |
|---|---|---|---|
| `island_visit_started` | Player loads the game island for the first time in a session — top of conversion funnel | `app/page.tsx` | client |
| `encounter_started` | Player begins an encounter (walks into a challenge on the island) | `src/components/EncounterModal.tsx` | client |
| `prompt_submitted` | Player submits a prompt attempt for grading | `src/components/EncounterModal.tsx` | client |
| `encounter_completed` | Player wins an encounter (prompt passes grading threshold) | `src/components/EncounterModal.tsx` | client |
| `prompt_saved_to_library` | Player saves a winning prompt to their Library | `src/components/EncounterModal.tsx` | client |
| `library_entry_exported` | Player exports a Library entry for use in Cursor/Claude Code/Cowork | `app/library/page.tsx` | client |
| `player_identity_upgraded` | Anonymous player links their email (saves their island) | `src/components/SaveIslandModal.tsx` | client |
| `encounter_grade_completed` | Server: grading API returns a verdict for a player prompt | `app/api/encounter/grade/route.ts` | server |
| `auth_magic_link_sent` | Server: magic link email dispatched during anonymous-to-email upgrade | `app/api/auth/upgrade/route.ts` | server |
| `rate_limit_hit` | Player has exhausted their daily encounter attempts (20/day cap) | `app/api/encounter/grade/route.ts` | server |

### Identify users

Call `posthog.identify(userId, { email, is_anonymous: false })` in the client when a player upgrades from anonymous to email (`player_identity_upgraded`). On server-side routes, pass the `X-PostHog-Distinct-ID` and `X-PostHog-Session-ID` headers from the client to correlate server and client events.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/163135/dashboard/633159
- **Encounter conversion funnel**: https://eu.posthog.com/project/163135/insights/RwibwDlg
- **Daily active players**: https://eu.posthog.com/project/163135/insights/95itkiye
- **Library exports over time**: https://eu.posthog.com/project/163135/insights/qx9FZS50
- **Player identity upgrades**: https://eu.posthog.com/project/163135/insights/gUrAaNF2
- **Rate limit hits**: https://eu.posthog.com/project/163135/insights/NKkihW4h

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
