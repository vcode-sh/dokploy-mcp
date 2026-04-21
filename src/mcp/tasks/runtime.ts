import {
  InMemoryTaskMessageQueue,
  InMemoryTaskStore,
  isTerminal,
} from '@modelcontextprotocol/sdk/experimental/tasks'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, Task } from '@modelcontextprotocol/sdk/types.js'

const DEFAULT_TASK_TTL_MS = 10 * 60 * 1000
const MAX_TASK_TTL_MS = 30 * 60 * 1000
const MIN_TASK_POLL_INTERVAL_MS = 250
const MAX_TASK_POLL_INTERVAL_MS = 5_000

export const DEFAULT_TASK_POLL_INTERVAL_MS = 1_500

function clampTaskTtl(requestedTtl?: number | null) {
  if (typeof requestedTtl !== 'number' || !Number.isFinite(requestedTtl) || requestedTtl <= 0) {
    return DEFAULT_TASK_TTL_MS
  }

  return Math.min(Math.trunc(requestedTtl), MAX_TASK_TTL_MS)
}

function clampTaskPollInterval(pollInterval = DEFAULT_TASK_POLL_INTERVAL_MS) {
  if (!Number.isFinite(pollInterval) || pollInterval <= 0) {
    return DEFAULT_TASK_POLL_INTERVAL_MS
  }

  return Math.min(
    Math.max(Math.trunc(pollInterval), MIN_TASK_POLL_INTERVAL_MS),
    MAX_TASK_POLL_INTERVAL_MS,
  )
}

function buildTaskErrorResult(message: string, details?: string): CallToolResult {
  const payload = { error: message, ...(details ? { details } : {}) }

  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: true,
  }
}

type TaskCleanupCallback = () => void | Promise<void>

export class ManagedTaskStore extends InMemoryTaskStore {
  private readonly abortControllers = new Map<string, AbortController>()
  private readonly cancelResults = new Map<string, CallToolResult>()
  private readonly cleanupCallbacks = new Map<string, TaskCleanupCallback>()
  private readonly auxiliaryCleanupTimers = new Map<string, NodeJS.Timeout>()

  registerAbortController(
    taskId: string,
    controller: AbortController,
    cleanupCallback?: TaskCleanupCallback,
  ) {
    this.abortControllers.set(taskId, controller)
    if (cleanupCallback) {
      this.cleanupCallbacks.set(taskId, cleanupCallback)
    }
  }

  override async createTask(
    taskParams: { ttl?: number | null; pollInterval?: number },
    requestId: string | number,
    request: { method: string; params?: Record<string, unknown> },
    sessionId?: string,
  ) {
    const task = await super.createTask(taskParams, requestId, request, sessionId)
    this.scheduleAuxiliaryCleanup(task.taskId, task.ttl)
    return task
  }

  override async storeTaskResult(
    taskId: string,
    status: 'completed' | 'failed',
    result: CallToolResult,
    sessionId?: string,
  ) {
    this.cancelResults.delete(taskId)
    this.clearRunningState(taskId)
    await super.storeTaskResult(taskId, status, result, sessionId)

    const task = await super.getTask(taskId, sessionId)
    this.scheduleAuxiliaryCleanup(taskId, task?.ttl ?? null)
  }

  override async getTaskResult(taskId: string, sessionId?: string) {
    try {
      return (await super.getTaskResult(taskId, sessionId)) as CallToolResult
    } catch (error) {
      const task = await super.getTask(taskId, sessionId)
      if (task?.status === 'cancelled') {
        return (
          this.cancelResults.get(taskId) ??
          buildTaskErrorResult(
            'Task cancelled',
            task.statusMessage ?? 'Task execution was cancelled.',
          )
        )
      }

      throw error
    }
  }

  override async updateTaskStatus(
    taskId: string,
    status: Task['status'],
    statusMessage?: string,
    sessionId?: string,
  ) {
    if (status === 'cancelled') {
      this.cancelResults.set(
        taskId,
        buildTaskErrorResult(
          'Task cancelled',
          statusMessage ?? 'Task execution was cancelled before completion.',
        ),
      )
      await this.abortTask(taskId)
    }

    await super.updateTaskStatus(taskId, status, statusMessage, sessionId)

    if (isTerminal(status)) {
      this.clearRunningState(taskId)
      const task = await super.getTask(taskId, sessionId)
      this.scheduleAuxiliaryCleanup(taskId, task?.ttl ?? null)
    }
  }

  async shutdown(reason = 'Server shutdown cancelled all in-flight tasks.') {
    for (const task of this.getAllTasks()) {
      if (isTerminal(task.status)) {
        continue
      }

      try {
        await this.updateTaskStatus(task.taskId, 'cancelled', reason)
      } catch {
        // Best-effort cancellation only.
      }
    }

    this.clearAuxiliaryTimers()
    super.cleanup()
    this.abortControllers.clear()
    this.cancelResults.clear()
    this.cleanupCallbacks.clear()
  }

  private async abortTask(taskId: string) {
    const controller = this.abortControllers.get(taskId)
    if (controller && !controller.signal.aborted) {
      controller.abort()
    }

    const cleanupCallback = this.cleanupCallbacks.get(taskId)
    if (!cleanupCallback) {
      return
    }

    try {
      await cleanupCallback()
    } catch {
      // Best-effort cleanup only.
    }
  }

  private clearRunningState(taskId: string) {
    this.abortControllers.delete(taskId)
    this.cleanupCallbacks.delete(taskId)
  }

  private scheduleAuxiliaryCleanup(taskId: string, ttl: number | null) {
    const existingTimer = this.auxiliaryCleanupTimers.get(taskId)
    if (existingTimer) {
      clearTimeout(existingTimer)
      this.auxiliaryCleanupTimers.delete(taskId)
    }

    if (typeof ttl !== 'number' || ttl <= 0) {
      return
    }

    const timer = setTimeout(() => {
      this.cancelResults.delete(taskId)
      this.cleanupCallbacks.delete(taskId)
      this.abortControllers.delete(taskId)
      this.auxiliaryCleanupTimers.delete(taskId)
    }, ttl)
    timer.unref?.()
    this.auxiliaryCleanupTimers.set(taskId, timer)
  }

  private clearAuxiliaryTimers() {
    for (const timer of this.auxiliaryCleanupTimers.values()) {
      clearTimeout(timer)
    }

    this.auxiliaryCleanupTimers.clear()
  }
}

export interface TaskRuntime {
  store: ManagedTaskStore
  messageQueue: InMemoryTaskMessageQueue
  createTaskOptions: (
    requestedTtl?: number | null,
    pollInterval?: number,
  ) => {
    ttl: number
    pollInterval: number
  }
  shutdown: (reason?: string) => Promise<void>
}

const serverTaskRuntimes = new WeakMap<McpServer, TaskRuntime>()

export function createTaskRuntime(): TaskRuntime {
  const store = new ManagedTaskStore()
  const messageQueue = new InMemoryTaskMessageQueue()

  return {
    store,
    messageQueue,
    createTaskOptions(requestedTtl, pollInterval) {
      return {
        ttl: clampTaskTtl(requestedTtl),
        pollInterval: clampTaskPollInterval(pollInterval),
      }
    },
    shutdown(reason) {
      return store.shutdown(reason)
    },
  }
}

export function attachTaskRuntime(server: McpServer, runtime: TaskRuntime) {
  serverTaskRuntimes.set(server, runtime)
  let shutdownPromise: Promise<void> | undefined
  const originalClose = server.close.bind(server)

  server.close = async () => {
    shutdownPromise ??= runtime.shutdown()

    await Promise.allSettled([shutdownPromise, originalClose()])
  }
}

export function getTaskRuntime(server: McpServer) {
  return serverTaskRuntimes.get(server)
}
