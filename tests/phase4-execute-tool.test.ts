import type {
  CreateTaskRequestHandlerExtra,
  TaskRequestHandlerExtra,
} from '@modelcontextprotocol/sdk/experimental/tasks'
import { describe, expect, it } from 'vitest'
import { createExecuteTool } from '../src/codemode/tools/execute.js'
import { createTaskRuntime, DEFAULT_TASK_POLL_INTERVAL_MS } from '../src/mcp/tasks/runtime.js'

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
})
