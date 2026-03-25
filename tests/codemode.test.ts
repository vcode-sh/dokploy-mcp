import { describe, expect, it } from 'vitest'

import { runSandboxedFunction } from '../src/codemode/sandbox/runner.js'
import { buildExecuteContext } from '../src/codemode/tools/execute.js'
import { searchTool } from '../src/codemode/tools/search.js'
import { dokployCatalog } from '../src/generated/dokploy-catalog.js'
import { createServer } from '../src/server.js'

describe('codemode runtime', () => {
  it('creates a codemode server instance', () => {
    const server = createServer()
    expect(server).toBeDefined()
  })

  it('loads a non-empty generated catalog', () => {
    expect(dokployCatalog.endpointCount).toBeGreaterThan(0)
    expect(dokployCatalog.endpoints.length).toBe(dokployCatalog.endpointCount)
  })

  it('search tool can query the generated catalog', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("notification").slice(0, 5).map((entry) => entry.procedure)',
    })

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toBeDefined()

    const payload = result.structuredContent as { result?: unknown; logs?: string[] }
    expect(Array.isArray(payload.result)).toBe(true)
    expect((payload.result as string[]).some((entry) => entry.startsWith('notification.'))).toBe(
      true,
    )
    expect(payload.logs).toEqual([])
  })

  it('search rejects non-async code', async () => {
    const result = await searchTool.handler({
      code: '() => 1',
    })

    expect(result.isError).toBe(true)
  })

  it('search catalog get returns a full contract view', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('application.update')",
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toBeDefined()

    const contract = payload.result as Record<string, unknown>
    expect(contract.procedure).toBe('application.update')
    expect(contract.inputSchema).toBeDefined()
    expect(contract.outputSchema).toBeDefined()
  })

  it('bounds array search results', async () => {
    const result = await searchTool.handler({
      code: 'async () => Array.from({ length: 200 }, (_, index) => index)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(Array.isArray(payload.result)).toBe(true)
    expect(payload.result as unknown[]).toHaveLength(50)
  })

  it('builds an execute context that can orchestrate multiple calls', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(procedure)
      return {
        data: { procedure, input },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 5)

    const project = await context.dokploy.project.one({ projectId: 'p1' })
    const application = await context.dokploy.call('application.one', { applicationId: 'a1' })

    expect(project).toEqual({
      procedure: 'project.one',
      input: { projectId: 'p1' },
    })
    expect(application).toEqual({
      procedure: 'application.one',
      input: { applicationId: 'a1' },
    })
    expect(calls).toEqual(['project.one', 'application.one'])
    expect(context.getCalls()).toHaveLength(2)
  })

  it('enforces the execute max call budget', async () => {
    const context = buildExecuteContext(async (procedure) => {
      return {
        data: { procedure },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 1)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            await dokploy.project.all({})
            await dokploy.project.all({})
            return true
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('Code Mode execute exceeded 1 API calls.')
  })

  it('enforces the aggregated Dokploy response budget', async () => {
    const previous = process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES
    process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = '32'

    try {
      const { createSandboxHost } = await import('../src/codemode/sandbox/host.js')
      const sandboxHost = createSandboxHost({
        maxCalls: 5,
        executor: async (procedure) => {
          return {
            data: { procedure, payload: 'x'.repeat(128) },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        },
      })

      await expect(sandboxHost.call('project.all', {})).rejects.toThrow(
        'Code Mode execute exceeded 32 bytes of Dokploy responses.',
      )
    } finally {
      if (previous === undefined) {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = undefined
      } else {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = previous
      }
    }
  })
})
