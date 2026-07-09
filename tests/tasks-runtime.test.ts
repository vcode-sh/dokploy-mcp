import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { describe, expect, it, vi } from 'vitest'
import { runPreparedDeployApplicationTask } from '../src/codemode/workflows/deploy-application.js'
import { createFallbackWorkflowPlan } from '../src/mcp/sampling/runtime.js'
import { attachTaskRuntime, createTaskRuntime, getTaskRuntime } from '../src/mcp/tasks/runtime.js'

function createPreparedDeployTask(
  overrides: {
    rollout?: {
      includeProjectLogs: boolean
      tailLines: number
      waitForRollout: boolean
      pollIntervalMs: number
      maxPolls: number
    }
    executor?: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
  } = {},
) {
  const input = {
    kind: 'deploy-application' as const,
    applicationId: 'app-1',
    intent: 'Apply a prepared rollout task.',
    action: 'apply' as const,
  }
  const application = {
    applicationId: 'app-1',
    name: 'Frontend',
    appName: 'frontend',
    applicationStatus: 'running',
    projectId: 'project-1',
    environmentId: 'env-1',
    serverId: 'server-1',
    latestDeploymentId: 'dep-1',
  }
  const rollout = overrides.rollout ?? {
    includeProjectLogs: false,
    tailLines: 0,
    waitForRollout: true,
    pollIntervalMs: 250,
    maxPolls: 2,
  }
  const executor =
    overrides.executor ??
    (async (procedure: string) => {
      if (procedure === 'application.deploy') {
        return {
          deploymentId: 'dep-2',
          applicationId: 'app-1',
          status: 'queued',
        }
      }

      if (procedure === 'deployment.latestByType') {
        return {
          id: 'app-1',
          type: 'application',
          total: 1,
          latestDeployment: {
            deploymentId: 'dep-2',
            status: 'queued',
          },
        }
      }

      throw new Error(`Unexpected procedure ${procedure}`)
    })

  return {
    input,
    application,
    resolved: {
      applicationId: 'app-1',
      intent: input.intent,
      action: 'apply' as const,
      rollout,
    },
    rollout,
    planResult: {
      source: 'fallback' as const,
      plan: createFallbackWorkflowPlan({
        workflowKind: input.kind,
        action: 'apply',
        intent: input.intent,
        application,
        rollout,
      }),
    },
    executor,
    pollExecutor: executor,
    getCalls: () => [],
  }
}

describe('phase 4 task runtime', () => {
  it('clamps requested task ttl and polling intervals to bounded in-process defaults', () => {
    const runtime = createTaskRuntime()

    expect(runtime.createTaskOptions()).toEqual({
      ttl: 10 * 60 * 1000,
      pollInterval: 1_500,
    })
    expect(runtime.createTaskOptions(99_999_999, 99_999)).toEqual({
      ttl: 30 * 60 * 1000,
      pollInterval: 5_000,
    })
    expect(runtime.createTaskOptions(-1, 10)).toEqual({
      ttl: 10 * 60 * 1000,
      pollInterval: 250,
    })
  })

  it('returns a stable cancelled task result and aborts registered controllers', async () => {
    const runtime = createTaskRuntime()
    const task = await runtime.store.createTask(runtime.createTaskOptions(5_000, 1_500), 1, {
      method: 'tools/call',
      params: {
        name: 'execute',
      },
    })
    const controller = new AbortController()

    runtime.store.registerAbortController(task.taskId, controller)
    await runtime.store.updateTaskStatus(task.taskId, 'cancelled', 'User cancelled this task.')

    const cancelledTask = await runtime.store.getTask(task.taskId)
    const cancelledResult = (await runtime.store.getTaskResult(task.taskId)) as CallToolResult

    expect(controller.signal.aborted).toBe(true)
    expect(cancelledTask).toMatchObject({
      taskId: task.taskId,
      status: 'cancelled',
      statusMessage: 'User cancelled this task.',
    })
    expect(cancelledResult.isError).toBe(true)
    expect(cancelledResult.structuredContent).toMatchObject({
      error: 'Task cancelled',
      details: 'User cancelled this task.',
    })
  })

  it('runs registered cleanup callbacks on cancellation and uses the default cancelled detail when omitted', async () => {
    const runtime = createTaskRuntime()
    const task = await runtime.store.createTask(runtime.createTaskOptions(5_000, 1_500), 1, {
      method: 'tools/call',
      params: {
        name: 'execute',
      },
    })
    const cleanupCallback = vi.fn(async () => undefined)

    runtime.store.registerAbortController(task.taskId, new AbortController(), cleanupCallback)
    await runtime.store.updateTaskStatus(task.taskId, 'cancelled')

    const cancelledResult = (await runtime.store.getTaskResult(task.taskId)) as CallToolResult

    expect(cleanupCallback).toHaveBeenCalledOnce()
    expect(cancelledResult.structuredContent).toMatchObject({
      error: 'Task cancelled',
      details: 'Task execution was cancelled before completion.',
    })
  })

  it('swallows cleanup callback failures while keeping cancellation observable', async () => {
    const runtime = createTaskRuntime()
    const task = await runtime.store.createTask(runtime.createTaskOptions(5_000, 1_500), 1, {
      method: 'tools/call',
      params: {
        name: 'execute',
      },
    })
    const cleanupCallback = vi.fn(async () => {
      throw new Error('cleanup boom')
    })

    runtime.store.registerAbortController(task.taskId, new AbortController(), cleanupCallback)

    await expect(
      runtime.store.updateTaskStatus(task.taskId, 'cancelled', 'Cleanup callback failed.'),
    ).resolves.toBeUndefined()

    const cancelledTask = await runtime.store.getTask(task.taskId)

    expect(cleanupCallback).toHaveBeenCalledOnce()
    expect(cancelledTask?.status).toBe('cancelled')
  })

  it('cancels in-flight tasks during shutdown and clears the in-memory registry', async () => {
    const runtime = createTaskRuntime()
    const first = await runtime.store.createTask(runtime.createTaskOptions(5_000, 1_500), 1, {
      method: 'tools/call',
      params: { name: 'execute' },
    })
    const second = await runtime.store.createTask(runtime.createTaskOptions(5_000, 1_500), 2, {
      method: 'tools/call',
      params: { name: 'execute' },
    })
    const firstController = new AbortController()
    const secondController = new AbortController()

    runtime.store.registerAbortController(first.taskId, firstController)
    runtime.store.registerAbortController(second.taskId, secondController)

    await runtime.shutdown('Server shutdown cancelled all in-flight tasks.')

    expect(firstController.signal.aborted).toBe(true)
    expect(secondController.signal.aborted).toBe(true)
    expect(runtime.store.getAllTasks()).toEqual([])
  })

  it('cleans auxiliary cancellation state after the bounded task ttl elapses', async () => {
    vi.useFakeTimers()

    try {
      const runtime = createTaskRuntime()
      const task = await runtime.store.createTask(runtime.createTaskOptions(500, 1_500), 1, {
        method: 'tools/call',
        params: { name: 'execute' },
      })
      const controller = new AbortController()

      runtime.store.registerAbortController(task.taskId, controller)
      await runtime.store.updateTaskStatus(task.taskId, 'cancelled', 'Timed cleanup path.')

      await vi.advanceTimersByTimeAsync(500)

      await expect(runtime.store.getTaskResult(task.taskId)).rejects.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns a timeout rollout summary when the prepared deploy task never reaches a terminal deployment state', async () => {
    const result = await runPreparedDeployApplicationTask(createPreparedDeployTask())

    expect(result).toMatchObject({
      outcome: 'applied',
      rolloutStatus: {
        status: 'timeout',
        attempts: 2,
      },
    })
  })

  it('aborts a prepared deploy rollout task when the provided signal is cancelled', async () => {
    const controller = new AbortController()
    const promise = runPreparedDeployApplicationTask(createPreparedDeployTask(), controller.signal)

    controller.abort()

    await expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('binds task runtime shutdown to server.close and reuses the same shutdown promise across repeated closes', async () => {
    const runtime = createTaskRuntime()
    const shutdown = vi
      .spyOn(runtime, 'shutdown')
      .mockImplementation(async () => await Promise.resolve(undefined))
    const originalClose = vi.fn(async () => await Promise.resolve(undefined))
    const server = {
      close: originalClose,
    }

    expect(getTaskRuntime(server as never)).toBeUndefined()

    attachTaskRuntime(server as never, runtime)

    expect(getTaskRuntime(server as never)).toBe(runtime)

    await server.close()
    await server.close()

    expect(shutdown).toHaveBeenCalledTimes(1)
    expect(originalClose).toHaveBeenCalledTimes(2)
  })
})
