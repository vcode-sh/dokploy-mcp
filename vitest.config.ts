import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/cli/index.ts', 'src/generated/**'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 85,
        statements: 84,
        branches: 70,
        functions: 90,
        'src/http/**/*.ts': { lines: 90, statements: 90, functions: 90, branches: 85 },
        'src/config/resolver.ts': { lines: 90, statements: 90, functions: 90, branches: 83 },
        'src/api/client.ts': { lines: 90, statements: 90, functions: 90, branches: 85 },
      },
    },
  },
})
