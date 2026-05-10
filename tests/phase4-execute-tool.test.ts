import type {
  CreateTaskRequestHandlerExtra,
  TaskRequestHandlerExtra,
} from '@modelcontextprotocol/sdk/experimental/tasks'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { execSyncMock, existsSyncMock, mkdirSyncMock, readFileSyncMock, writeFileSyncMock } =
  vi.hoisted(() => ({
    execSyncMock: vi.fn(),
    existsSyncMock: vi.fn(),
    mkdirSyncMock: vi.fn(),
    readFileSyncMock: vi.fn(),
    writeFileSyncMock: vi.fn(),
  }))

vi.mock('node:child_process', () => ({
  execSync: execSyncMock,
}))

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
}))

import { createExecuteTool } from '../src/codemode/tools/execute.js'
import { createResolvedConfig, withResolvedConfigOverride } from '../src/config/resolver.js'
import { createTaskRuntime, DEFAULT_TASK_POLL_INTERVAL_MS } from '../src/mcp/tasks/runtime.js'

beforeEach(() => {
  execSyncMock.mockReset()
  existsSyncMock.mockReset()
  mkdirSyncMock.mockReset()
  readFileSyncMock.mockReset()
  writeFileSyncMock.mockReset()
  execSyncMock.mockImplementation(() => {
    throw new Error('Unexpected Dokploy CLI lookup')
  })
  existsSyncMock.mockReturnValue(false)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

afterAll(() => {
  vi.doUnmock('node:child_process')
  vi.doUnmock('node:fs')
  vi.resetModules()
})

function createTaskExtra() {
  const runtime = createTaskRuntime()
  let requestId = 0

  const taskStore: CreateTaskRequestHandlerExtra['taskStore'] = {
    createTask: async (taskParams) => {
      requestId += 1
      return await runtime.store.createTask(taskParams, requestId, {
        method: 'tools/call',
        params: {
          name: 'execute',
        },
      })
    },
    getTask: async (taskId) => {
      const task = await runtime.store.getTask(taskId)
      if (!task) {
        throw new Error(`Missing task: ${taskId}`)
      }

      return task
    },
    storeTaskResult: async (taskId, status, result) => {
      await runtime.store.storeTaskResult(taskId, status, result)
    },
    getTaskResult: async (taskId) => {
      return await runtime.store.getTaskResult(taskId)
    },
    updateTaskStatus: async (taskId, status, statusMessage) => {
      await runtime.store.updateTaskStatus(taskId, status, statusMessage)
    },
    listTasks: async (cursor) => {
      return await runtime.store.listTasks(cursor)
    },
  }

  return {
    runtime,
    extra: {
      taskStore,
      taskRequestedTtl: undefined,
      signal: new AbortController().signal,
      requestId: 1,
      sendNotification: async () => undefined,
      sendRequest: async () => {
        throw new Error('Unexpected nested task request')
      },
    } satisfies CreateTaskRequestHandlerExtra,
  }
}

function createTrpcTextResponse(json: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    async text() {
      return JSON.stringify({
        result: {
          data: {
            json,
          },
        },
      })
    },
  }
}

describe('phase 4 execute tool metadata', () => {
  it('keeps the legacy direct code path working while advertising optional task support', async () => {
    const tool = createExecuteTool()
    const result = await tool.handler({
      code: 'return { ok: true, value: 2 + 2 }',
    })

    expect(tool.execution).toEqual({
      taskSupport: 'optional',
    })
    expect(tool.taskHandler).toBeDefined()
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({
      result: {
        ok: true,
        value: 4,
      },
      logs: [],
      calls: [],
    })
  })

  it('uses fallback task defaults and resolves code tasks even without a bound server runtime', async () => {
    const tool = createExecuteTool()
    const taskHandler = tool.taskHandler as {
      createTask: (
        input: Record<string, unknown>,
        extra: CreateTaskRequestHandlerExtra,
      ) => Promise<{
        task: { taskId: string; pollInterval?: number }
      }>
      getTask: (
        input: Record<string, unknown>,
        extra: TaskRequestHandlerExtra,
      ) => Promise<{
        status: string
      }>
      getTaskResult: (
        input: Record<string, unknown>,
        extra: TaskRequestHandlerExtra,
      ) => Promise<{ structuredContent?: Record<string, unknown> }>
    }
    const { extra } = createTaskExtra()
    const created = await taskHandler.createTask(
      {
        code: 'return { ok: true, source: "manual-task" }',
      },
      extra,
    )

    const taskExtra = {
      ...extra,
      taskId: created.task.taskId,
    } satisfies TaskRequestHandlerExtra
    let task = await taskHandler.getTask({}, taskExtra)

    for (let attempt = 0; attempt < 20 && task.status === 'working'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25))
      task = await taskHandler.getTask({}, taskExtra)
    }

    const result = await taskHandler.getTaskResult({}, taskExtra)

    expect(created.task.pollInterval).toBe(DEFAULT_TASK_POLL_INTERVAL_MS)
    expect(task.status).toBe('completed')
    expect(result.structuredContent).toMatchObject({
      result: {
        ok: true,
        source: 'manual-task',
      },
    })
  })

  it('stores an immediate failed task result when workflow mode is requested without a bound server', async () => {
    const tool = createExecuteTool()
    const taskHandler = tool.taskHandler as {
      createTask: (
        input: Record<string, unknown>,
        extra: CreateTaskRequestHandlerExtra,
      ) => Promise<{
        task: { taskId: string }
      }>
    }
    const { extra } = createTaskExtra()
    const created = await taskHandler.createTask(
      {
        workflow: {
          kind: 'deploy-application',
          applicationId: 'app-1',
          intent: 'Preview without bound server.',
          action: 'preview',
        },
      },
      extra,
    )
    const task = await extra.taskStore.getTask(created.task.taskId)
    const result = await extra.taskStore.getTaskResult(created.task.taskId)

    expect(task.status).toBe('failed')
    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        error: 'Failed to execute execute',
        details: 'Guided execute workflows require a bound MCP server instance.',
      },
    })
  })

  it('surfaces structured validation errors from execute code as readable details', async () => {
    const tool = createExecuteTool()
    const result = await tool.handler({
      code: 'return await dokploy.application.update({ applicationId: "app-1", memoryLimit: "256M" })',
    })

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      error: 'Failed to execute execute',
      details: expect.stringContaining('memoryLimit must be a string containing bytes'),
    })
  })

  it('requires a profile for direct execute when multiple profiles are configured', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'secret-redivo-key',
        },
        personal: {
          url: 'https://personal.example.com',
          apiKey: 'secret-personal-key',
        },
      }),
    )

    const tool = createExecuteTool()
    const result = await tool.handler({
      code: 'return { ok: true }',
    })

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      error: 'Failed to execute execute',
      details:
        'Dokploy profile is required when multiple profiles are configured. Available profiles: personal, redivo.',
    })
    expect(JSON.stringify(result.structuredContent)).not.toContain('secret')
  })

  it('uses the selected profile for direct execute API calls', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'redivo-key',
        },
        mezon: {
          url: 'https://mezon.example.com',
          apiKey: 'mezon-key',
        },
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue(createTrpcTextResponse([{ projectId: 'p1' }]))
    vi.stubGlobal('fetch', fetchMock)

    const tool = createExecuteTool()
    const result = await tool.handler({
      profile: 'mezon',
      code: 'return await dokploy.project.all()',
    })

    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({
      result: [{ projectId: 'p1' }],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://mezon.example.com/api/trpc/project.all'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'mezon-key',
        }),
      }),
    )
  })

  it('rejects named profiles when request-scoped HTTP credentials are active', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'redivo-key',
        },
      }),
    )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const tool = createExecuteTool()
    const result = await withResolvedConfigOverride(
      createResolvedConfig('https://remote.example.com', 'remote-key', 'http-headers', 45_000),
      () =>
        tool.handler({
          profile: 'redivo',
          code: 'return await dokploy.project.all()',
        }),
    )

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      error: 'Failed to execute execute',
      details:
        'Named Dokploy profiles are unavailable when request-scoped HTTP credentials are active. Omit `profile` to use the bound session credentials.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the selected profile for task-based execute API calls', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'redivo-key',
        },
        personal: {
          url: 'https://personal.example.com',
          apiKey: 'personal-key',
        },
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue(createTrpcTextResponse([{ projectId: 'p2' }]))
    vi.stubGlobal('fetch', fetchMock)

    const tool = createExecuteTool()
    const taskHandler = tool.taskHandler as {
      createTask: (
        input: Record<string, unknown>,
        extra: CreateTaskRequestHandlerExtra,
      ) => Promise<{
        task: { taskId: string }
      }>
      getTask: (
        input: Record<string, unknown>,
        extra: TaskRequestHandlerExtra,
      ) => Promise<{
        status: string
      }>
      getTaskResult: (
        input: Record<string, unknown>,
        extra: TaskRequestHandlerExtra,
      ) => Promise<{ structuredContent?: Record<string, unknown> }>
    }
    const { extra } = createTaskExtra()
    const created = await taskHandler.createTask(
      {
        profile: 'personal',
        code: 'return await dokploy.project.all()',
      },
      extra,
    )

    const taskExtra = {
      ...extra,
      taskId: created.task.taskId,
    } satisfies TaskRequestHandlerExtra
    let task = await taskHandler.getTask({}, taskExtra)

    for (let attempt = 0; attempt < 20 && task.status === 'working'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25))
      task = await taskHandler.getTask({}, taskExtra)
    }

    const result = await taskHandler.getTaskResult({}, taskExtra)

    expect(task.status).toBe('completed')
    expect(result.structuredContent).toMatchObject({
      result: [{ projectId: 'p2' }],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://personal.example.com/api/trpc/project.all'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'personal-key',
        }),
      }),
    )
  })

  it('rejects invalid profile selection before creating a task', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'redivo-key',
        },
      }),
    )

    const tool = createExecuteTool()
    const taskHandler = tool.taskHandler as {
      createTask: (
        input: Record<string, unknown>,
        extra: CreateTaskRequestHandlerExtra,
      ) => Promise<{
        task: { taskId: string }
      }>
    }
    const { extra } = createTaskExtra()

    await expect(
      withResolvedConfigOverride(
        createResolvedConfig('https://remote.example.com', 'remote-key', 'http-headers', 45_000),
        () =>
          taskHandler.createTask(
            {
              profile: 'redivo',
              code: 'return await dokploy.project.all()',
            },
            extra,
          ),
      ),
    ).rejects.toThrow(
      'Named Dokploy profiles are unavailable when request-scoped HTTP credentials are active. Omit `profile` to use the bound session credentials.',
    )
  })
})
