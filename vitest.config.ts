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
      exclude: ['src/index.ts', 'src/cli/**', 'src/generated/**'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 85,
        statements: 84,
        branches: 70,
        functions: 90,
      },
    },
  },
})
