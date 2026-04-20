import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GatewayCallResult } from '../src/codemode/gateway/api-gateway.js'
import type { SandboxExecutionResult, SandboxLimits } from '../src/codemode/sandbox/types.js'

const { createExecuteContextMock, createSearchCatalogViewMock, runSandboxedFunctionMock } =
  vi.hoisted(() => ({
    createExecuteContextMock: vi.fn(),
    createSearchCatalogViewMock: vi.fn(),
    runSandboxedFunctionMock: vi.fn(),
  }))

vi.mock('../src/codemode/context/execute-context.js', () => ({
  createExecuteContext: createExecuteContextMock,
}))

vi.mock('../src/codemode/context/search-context.js', () => ({
  createSearchCatalogView: createSearchCatalogViewMock,
}))

vi.mock('../src/codemode/sandbox/runner.js', () => ({
  runSandboxedFunction: runSandboxedFunctionMock,
}))

function createLimits(overrides: Partial<SandboxLimits> = {}): SandboxLimits {
  return {
    timeoutMs: 25,
    maxResultBytes: 1024,
    maxLogBytes: 1024,
    maxCalls: 5,
    maxResponseBytes: 1024,
    maxHeapDeltaBytes: 1024,
    ...overrides,
  }
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

async function loadWorkerEntry() {
  vi.resetModules()
  const existingListeners = new Set(process.listeners('message'))
  await import('../src/codemode/sandbox/worker-entry.js')
  const addedListeners = process
    .listeners('message')
    .filter((listener) => !existingListeners.has(listener))

  return () => {
    for (const listener of addedListeners) {
      process.off('message', listener)
    }
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('codemode worker entry', () => {
  it('handles search-mode run messages and returns the sandbox result', async () => {
    const sendCalls: unknown[] = []
    const originalSend = process.send
    process.send = vi.fn((message: unknown, callback?: (error: Error | null) => void) => {
      sendCalls.push(message)
      callback?.(null)
      return true
    }) as typeof process.send

    const catalog = {
      searchText: vi.fn(),
    }
    createSearchCatalogViewMock.mockReturnValue(catalog)
    runSandboxedFunctionMock.mockResolvedValue({
      result: ['project.all'],
      logs: ['scanned'],
    } satisfies SandboxExecutionResult)

    const cleanup = await loadWorkerEntry()
    process.emit('message', {
      type: 'run',
      mode: 'search',
      code: 'catalog.searchText("project")',
      limits: createLimits(),
    })
    await flushMicrotasks()

    expect(runSandboxedFunctionMock).toHaveBeenCalledWith({
      code: 'catalog.searchText("project")',
      context: {
        catalog,
      },
      limits: createLimits(),
    })
    expect(sendCalls).toContainEqual({
      type: 'done',
      ok: true,
      result: ['project.all'],
      logs: ['scanned'],
    })

    cleanup()
    process.send = originalSend
  })

  it('handles execute-mode RPC calls through process messages', async () => {
    const sendCalls: unknown[] = []
    const originalSend = process.send
    process.send = vi.fn((message: unknown, callback?: (error: Error | null) => void) => {
      sendCalls.push(message)
      callback?.(null)
      return true
    }) as typeof process.send

    createExecuteContextMock.mockImplementation(
      (
        rpcExecutor: (
          procedure: string,
          input?: Record<string, unknown>,
        ) => Promise<GatewayCallResult>,
      ) => ({
        dokploy: {
          project: {
            one: async (input: Record<string, unknown>) => {
              const response = await rpcExecutor('project.one', input)
              return response.data
            },
          },
        },
        helpers: {},
      }),
    )

    runSandboxedFunctionMock.mockImplementation(
      async ({
        context,
      }: {
        context: {
          dokploy: { project: { one: (input: Record<string, unknown>) => Promise<unknown> } }
        }
      }) => {
        const result = await context.dokploy.project.one({ projectId: 'project-1' })
        return {
          result,
          logs: [],
        } satisfies SandboxExecutionResult
      },
    )

    const cleanup = await loadWorkerEntry()
    process.emit('message', {
      type: 'run',
      mode: 'execute',
      code: 'await dokploy.project.one({ projectId: "project-1" })',
      limits: createLimits(),
    })
    await flushMicrotasks()

    const rpcCall = sendCalls.find(
      (
        call,
      ): call is {
        type: 'call'
        requestId: number
        procedure: string
        input: Record<string, unknown>
      } => typeof call === 'object' && call !== null && 'type' in call && call.type === 'call',
    )

    expect(rpcCall).toEqual({
      type: 'call',
      requestId: 1,
      procedure: 'project.one',
      input: { projectId: 'project-1' },
    })

    process.emit('message', {
      type: 'callResult',
      requestId: 1,
      ok: true,
      data: { projectId: 'project-1', name: 'Project 1' },
    })
    await flushMicrotasks()

    expect(sendCalls).toContainEqual({
      type: 'done',
      ok: true,
      result: { projectId: 'project-1', name: 'Project 1' },
      logs: [],
    })

    cleanup()
    process.send = originalSend
  })

  it('returns a failed done message when sandbox execution throws', async () => {
    const sendCalls: unknown[] = []
    const originalSend = process.send
    process.send = vi.fn((message: unknown, callback?: (error: Error | null) => void) => {
      sendCalls.push(message)
      callback?.(null)
      return true
    }) as typeof process.send

    createSearchCatalogViewMock.mockReturnValue({
      searchText: vi.fn(),
    })
    runSandboxedFunctionMock.mockRejectedValue(new Error('sandbox exploded'))

    const cleanup = await loadWorkerEntry()
    process.emit('message', {
      type: 'run',
      mode: 'search',
      code: 'catalog.searchText("project")',
      limits: createLimits(),
    })
    await flushMicrotasks()

    expect(sendCalls).toContainEqual({
      type: 'done',
      ok: false,
      error: 'sandbox exploded',
    })

    cleanup()
    process.send = originalSend
  })

  it('returns an explicit failure when IPC rejects a procedure call asynchronously', async () => {
    const sendCalls: unknown[] = []
    const originalSend = process.send
    process.send = vi.fn((message: unknown, callback?: (error: Error | null) => void) => {
      sendCalls.push(message)

      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'call'
      ) {
        callback?.(new Error('Do not know how to serialize a BigInt'))
        return true
      }

      callback?.(null)
      return true
    }) as typeof process.send

    createExecuteContextMock.mockImplementation(
      (
        rpcExecutor: (
          procedure: string,
          input?: Record<string, unknown>,
        ) => Promise<GatewayCallResult>,
      ) => ({
        dokploy: {
          call: (procedure: string, input?: Record<string, unknown>) =>
            rpcExecutor(procedure, input),
        },
        helpers: {},
      }),
    )

    runSandboxedFunctionMock.mockImplementation(
      async ({
        context,
      }: {
        context: {
          dokploy: {
            call: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
          }
        }
      }) => {
        await context.dokploy.call('project.one', {
          projectId: 'project-1',
          bad: 1n,
        })
        return {
          result: null,
          logs: [],
        } satisfies SandboxExecutionResult
      },
    )

    const cleanup = await loadWorkerEntry()
    process.emit('message', {
      type: 'run',
      mode: 'execute',
      code: 'await dokploy.call("project.one", { projectId: "project-1", bad: 1n })',
      limits: createLimits(),
    })
    await flushMicrotasks()

    expect(sendCalls).toContainEqual({
      type: 'done',
      ok: false,
      error: 'Sandbox worker failed to send procedure call: Do not know how to serialize a BigInt',
    })

    cleanup()
    process.send = originalSend
  })
})
