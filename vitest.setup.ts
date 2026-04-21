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
