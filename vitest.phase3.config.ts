import { defineConfig } from 'vitest/config'

const phase3Tests = [
  'tests/phase3-runtime.test.ts',
  'tests/phase3-schemas.test.ts',
  'tests/phase3-execute-tool.test.ts',
  'tests/phase3-execute-workflow.test.ts',
  'tests/phase3-adversarial.test.ts',
  'tests/server.test.ts',
  'tests/rawmode.test.ts',
  'tests/server-entry-options.test.ts',
  'tests/http-options.test.ts',
  'tests/codemode-contract.test.ts',
  'tests/codemode-budget.test.ts',
  'tests/codemode-protocol.test.ts',
  'tests/codemode-protocol-tools-list.test.ts',
  'tests/codemode-execute.integration.test.ts',
]

export default defineConfig({
  test: {
    include: phase3Tests,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      include: [
        'src/server.ts',
        'src/http/options.ts',
        'src/server-entry/options.ts',
        'src/mcp/capabilities/index.ts',
        'src/mcp/capabilities/tools.ts',
        'src/mcp/capabilities/sampling.ts',
        'src/mcp/capabilities/elicitation.ts',
        'src/mcp/registration/**/*.ts',
        'src/mcp/elicitation/**/*.ts',
        'src/mcp/sampling/**/*.ts',
        'src/codemode/tools/execute.ts',
        'src/codemode/workflows/**/*.ts',
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
