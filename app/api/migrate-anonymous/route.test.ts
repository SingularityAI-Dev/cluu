// app/api/migrate-anonymous/route.test.ts
// Route-level tests for POST /api/migrate-anonymous.
// Mocks @/lib/supabase/server to avoid needing a live Supabase during unit tests.
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shared mutable test state reachable from inside the mock factory.
const mockState = { authed: true, migration_processed: false };

vi.mock('@/lib/supabase/server', () => {
  return {
    createServerClient: vi.fn(async () => ({
      auth: {
        getUser: vi.fn(async () =>
          mockState.authed
            ? { data: { user: { id: 'user-a', email: 'a@test' } }, error: null }
            : { data: { user: null }, error: null },
        ),
      },
      from: vi.fn((_table: string) => {
        const selectEq = {
          single: vi.fn(async () => ({
            data: { migration_processed: mockState.migration_processed },
            error: null,
          })),
        };
        const selectChain = { eq: vi.fn(() => selectEq) };
        const updateChain = {
          eq: vi.fn(async () => {
            mockState.migration_processed = true;
            return { data: null, error: null };
          }),
        };
        const insertChain = {
          select: vi.fn(async () => ({ data: [{ id: 'new-1' }], error: null })),
        };
        const upsertChain = {
          select: vi.fn(async () => ({
            data: [{ cosmetic_id: 'petal_pin' }],
            error: null,
          })),
        };
        return {
          select: vi.fn(() => selectChain),
          update: vi.fn(() => updateChain),
          insert: vi.fn(() => insertChain),
          upsert: vi.fn(() => upsertChain),
        };
      }),
    })),
  };
});

// Import AFTER the mock is registered.
import { POST } from './route';

const validBody = {
  idempotencyKey: 'idm-route-1',
  anonymousState: {
    cluu_mood: 'content',
    cluu_cosmetics: { head: null, body: null, back: null, eyes: null },
    island_progress: {},
    unlocked_biomes: ['meadow'],
  },
  libraryEntries: [],
  userCosmetics: [],
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/migrate-anonymous', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/migrate-anonymous', () => {
  beforeEach(() => {
    mockState.authed = true;
    mockState.migration_processed = false;
  });

  it('returns 200 with processed=true on first call (authed + valid body)', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.processed).toBe(true);
  });

  it('returns 401 when no authed user', async () => {
    mockState.authed = false;
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('unauthorized');
  });

  it('returns 400 on missing required fields', async () => {
    const res = await POST(makeRequest({ bogus: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_body');
  });

  it('returns 400 on non-JSON body', async () => {
    const res = await POST(makeRequest('not-json'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('second call on same user returns processed=false (end-to-end idempotency)', async () => {
    const first = await POST(makeRequest(validBody));
    expect(first.status).toBe(200);
    expect((await first.json()).processed).toBe(true);

    const second = await POST(makeRequest(validBody));
    expect(second.status).toBe(200);
    const secondJson = await second.json();
    expect(secondJson.processed).toBe(false);
    expect(secondJson.reason).toBe('already_migrated');
  });
});
