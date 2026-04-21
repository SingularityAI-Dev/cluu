// tests/stubs/server-only.ts
// No-op stub for the `server-only` package during Vitest runs.
// The real guard still fires at Next.js build time; this just prevents the
// import from failing inside the unit-test bundler.
export {};
