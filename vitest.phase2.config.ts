import { defineConfig } from 'vitest/config'

const phase2Tests = [
  'tests/completions-runtime.test.ts',
  'tests/prompts-runtime.test.ts',
  'tests/prompts-protocol.test.ts',
  'tests/phase2-adversarial.test.ts',
  'tests/codemode-protocol.test.ts',
  'tests/server.test.ts',
  'tests/server-entry-options.test.ts',
  'tests/http-options.test.ts',
  'tests/http-server.test.ts',
  'tests/rawmode.test.ts',
]

export default defineConfig({
  test: {
    include: phase2Tests,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      include: [
        'src/server.ts',
        'src/http-server.ts',
        'src/server-entry/options.ts',
        'src/codemode/server-codemode.ts',
        'src/rawmode/server-rawmode.ts',
        'src/mcp/capabilities/completions.ts',
        'src/mcp/capabilities/prompts.ts',
        'src/mcp/completions/runtime.ts',
        'src/mcp/prompts/**/*.ts',
        'src/mcp/registration/**/*.ts',
      ],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 80,
      },
    },
  },
})
