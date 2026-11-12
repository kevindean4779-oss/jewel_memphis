import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // The database tests start an in-process Postgres per test; allow for a slow cold start.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
