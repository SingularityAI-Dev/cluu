// vitest.setup.ts
// Runs before every test file. Adds jsdom polyfills used by Plans 03-07.

// crypto.randomUUID polyfill — jsdom includes crypto but older Node APIs might miss randomUUID.
// State store (Plan 03) uses it for idempotency keys.
// Cast to a mutable shape so we can assign when jsdom hasn't provided the API.
type MutableCrypto = { randomUUID?: () => string };
const cryptoRef = (globalThis as unknown as { crypto?: MutableCrypto }).crypto;
if (!cryptoRef || typeof cryptoRef.randomUUID !== 'function') {
  const shim: MutableCrypto = cryptoRef ?? {};
  shim.randomUUID = () =>
    `test-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}` as ReturnType<
      Crypto['randomUUID']
    >;
  (globalThis as unknown as { crypto: MutableCrypto }).crypto = shim;
}

// jsdom in Node 24+ warns that localStorage is unavailable unless a local storage
// file is provided. Vitest's jsdom environment still needs a Storage implementation
// for the consent store and Zustand persistence tests.
type MutableWindow = typeof globalThis & {
  window?: typeof globalThis & { localStorage?: Storage; sessionStorage?: Storage };
  localStorage?: Storage;
  sessionStorage?: Storage;
};
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  } as Storage;
}
const memoryStorage = createMemoryStorage();
const target = globalThis as MutableWindow;
if (!target.localStorage) target.localStorage = memoryStorage;
if (!target.sessionStorage) target.sessionStorage = memoryStorage;
if (target.window && !target.window.localStorage) target.window.localStorage = memoryStorage;
if (target.window && !target.window.sessionStorage) target.window.sessionStorage = memoryStorage;

// @testing-library/jest-dom matchers are loaded lazily — Plan 04 installs the package.
// Guard the import so this file does not crash if run before that install.
try {
  // Use createRequire so the CJS-only jest-dom module loads cleanly in this ESM setup.
  const { createRequire } = await import('node:module');
  const nodeRequire = createRequire(import.meta.url);
  const jd = nodeRequire('@testing-library/jest-dom/vitest');
  void jd; // Import registers matchers as a side effect.
} catch {
  // Not yet installed (pre-Plan-04) — skip silently.
}
