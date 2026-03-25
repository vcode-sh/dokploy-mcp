import { describe, expect, it } from 'vitest'

import { runSandboxedFunction } from '../src/codemode/sandbox/runner.js'

describe('codemode sandbox security', () => {
  it('does not expose process', async () => {
    const result = await runSandboxedFunction({
      code: 'async () => typeof process',
      context: {},
    })

    expect(result.result).toBe('undefined')
  })

  it('does not expose fetch', async () => {
    const result = await runSandboxedFunction({
      code: 'async () => typeof fetch',
      context: {},
    })

    expect(result.result).toBe('undefined')
  })

  it('does not expose require', async () => {
    const result = await runSandboxedFunction({
      code: 'async () => typeof require',
      context: {},
    })

    expect(result.result).toBe('undefined')
  })

  it('does not expose Function constructor', async () => {
    const result = await runSandboxedFunction({
      code: 'async () => typeof Function',
      context: {},
    })

    expect(result.result).toBe('undefined')
  })

  it('blocks dynamic import', async () => {
    await expect(
      runSandboxedFunction({
        code: "async () => import('node:fs')",
        context: {},
      }),
    ).rejects.toBeInstanceOf(Error)
  })

  it('enforces result size limits', async () => {
    const previous = process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES
    process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES = '32'

    try {
      await expect(
        runSandboxedFunction({
          code: "async () => 'x'.repeat(128)",
          context: {},
        }),
      ).rejects.toThrow('Sandbox result exceeded 32 bytes.')
    } finally {
      if (previous === undefined) {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES = undefined
      } else {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES = previous
      }
    }
  })

  it('enforces heap delta limits', async () => {
    const previous = process.env.DOKPLOY_MCP_SANDBOX_MAX_HEAP_DELTA_BYTES
    const previousResultBytes = process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES
    process.env.DOKPLOY_MCP_SANDBOX_MAX_HEAP_DELTA_BYTES = '1024'
    process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES = '1048576'

    try {
      await expect(
        runSandboxedFunction({
          code: 'async () => Array.from({ length: 10_000 }, (_, index) => ({ index, value: index }))',
          context: {},
        }),
      ).rejects.toThrow('Sandbox heap delta exceeded 1024 bytes.')
    } finally {
      if (previous === undefined) {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_HEAP_DELTA_BYTES = undefined
      } else {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_HEAP_DELTA_BYTES = previous
      }

      if (previousResultBytes === undefined) {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES = undefined
      } else {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES = previousResultBytes
      }
    }
  })

  it('enforces log size limits', async () => {
    const previous = process.env.DOKPLOY_MCP_SANDBOX_MAX_LOG_BYTES
    process.env.DOKPLOY_MCP_SANDBOX_MAX_LOG_BYTES = '16'

    try {
      await expect(
        runSandboxedFunction({
          code: "async () => { console.log('x'.repeat(64)); return null }",
          context: {},
        }),
      ).rejects.toThrow('Sandbox logs exceeded 16 bytes.')
    } finally {
      if (previous === undefined) {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_LOG_BYTES = undefined
      } else {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_LOG_BYTES = previous
      }
    }
  })

  it('enforces timeout for synchronous loops', async () => {
    const previous = process.env.DOKPLOY_MCP_SANDBOX_TIMEOUT_MS
    process.env.DOKPLOY_MCP_SANDBOX_TIMEOUT_MS = '50'

    try {
      await expect(
        runSandboxedFunction({
          code: 'async () => { while (true) {} }',
          context: {},
        }),
      ).rejects.toThrow()
    } finally {
      if (previous === undefined) {
        process.env.DOKPLOY_MCP_SANDBOX_TIMEOUT_MS = undefined
      } else {
        process.env.DOKPLOY_MCP_SANDBOX_TIMEOUT_MS = previous
      }
    }
  })

  it('rejects non-serializable function results', async () => {
    await expect(
      runSandboxedFunction({
        code: 'async () => () => 1',
        context: {},
      }),
    ).rejects.toThrow('Sandbox returned a non-serializable value.')
  })

  it('rejects non-serializable symbol results', async () => {
    await expect(
      runSandboxedFunction({
        code: 'async () => Symbol("x")',
        context: {},
      }),
    ).rejects.toThrow('Sandbox returned a non-serializable value.')
  })
})
