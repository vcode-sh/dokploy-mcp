import { defineConfig } from 'vitest/config'

const phase5Tests = [
  'tests/phase5-metadata.test.ts',
  'tests/phase5-adversarial.test.ts',
  'tests/client.test.ts',
  'tests/config.test.ts',
  'tests/config-types.unit.test.ts',
  'tests/http-options.test.ts',
  'tests/http-request-handler.test.ts',
  'tests/http-request-handler-phase5-errors.test.ts',
  'tests/http-server.test.ts',
  'tests/server-entry-options.test.ts',
  'tests/server.test.ts',
  'tests/rawmode.test.ts',
  'tests/codemode-contract.test.ts',
  'tests/codemode-budget.test.ts',
  'tests/codemode-protocol.test.ts',
  'tests/codemode-protocol-tools-list.test.ts',
]

export default defineConfig({
  test: {
    include: phase5Tests as unknown as string[],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      include: [
        'src/api/client.ts',
        'src/config/resolver.ts',
        'src/http/options.ts',
        'src/http/request-handler.ts',
        'src/http/security.ts',
        'src/server-entry/options.ts',
      ],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
})
