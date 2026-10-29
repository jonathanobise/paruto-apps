import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'tests/**/*.test.ts',
      'apps/monitor/test/**/*.test.ts',
      'apps/api/test/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', 'tests/end-to-end/**'],
    environment: 'node',
    testTimeout: 20000,
  },
});
