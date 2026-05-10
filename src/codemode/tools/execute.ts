import type {
  CreateTaskRequestHandlerExtra,
  TaskRequestHandlerExtra,
} from '@modelcontextprotocol/sdk/experimental/tasks'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { resolveProfileConfig, withResolvedConfigOverride } from '../../config/resolver.js'
import type { McpCapabilityFlags } from '../../mcp/registration/types.js'
import { listResourceLinks } from '../../mcp/resources/resource-links.js'
import { DEFAULT_TASK_POLL_INTERVAL_MS, getTaskRuntime } from '../../mcp/tasks/runtime.js'
import { createTool, type ToolDefinition } from '../../mcp/tool-factory.js'
import { createExecuteContext } from '../context/execute-context.js'
import { getCodemodeErrorMessage } from '../error-message.js'
import type { GatewayCallResult } from '../gateway/api-gateway.js'
import type { SandboxHost } from '../sandbox/host.js'
import { createSandboxHost } from '../sandbox/host.js'
import { resolveSandboxLimits } from '../sandbox/limits.js'
import { runSandboxedFunction } from '../sandbox/runner.js'
import { resolveSandboxRuntime } from '../sandbox/runtime.js'
import { runExecuteInSubprocess } from '../sandbox/subprocess-runner.js'
import {
  type DeployApplicationWorkflowInput,
  prepareDeployApplicationWorkflow,
  runDeployApplicationWorkflow,
  runPreparedDeployApplicationTask,
} from '../workflows/deploy-application.js'

const deployApplicationWorkflowSchema = z
  .object({
    kind: z.literal('deploy-application'),
    applicationId: z.string().min(1).optional(),
    applicationQuery: z.string().min(1).max(120).optional(),
    projectId: z.string().min(1).optional(),
    environmentId: z.string().min(1).optional(),
    intent: z.string().min(3).max(160).optional(),
    action: z.enum(['preview', 'apply']).optional(),
    rollout: z
      .object({
        includeProjectLogs: z.boolean().optional(),
        tailLines: z.number().int().min(0).max(120).optional(),
        waitForRollout: z.boolean().optional(),
        pollIntervalMs: z.number().int().min(250).max(10_000).optional(),
        maxPolls: z.number().int().min(1).max(120).optional(),
      })
      .strict()
      .optional(),
    title: z.string().min(1).max(120).optional(),
    description: z.string().min(1).max(500).optional(),
    approvalUrl: z.string().url().optional(),
  })
  .strict()

const executeSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .optional()
      .describe(
        'JavaScript code. `dokploy` and `helpers` are globals -- do NOT wrap in a function. ' +
          'Simple: `await dokploy.project.all()`. ' +
          'Multi-step: `const app = await dokploy.application.one({ applicationId: "abc" }); return app.name`. ' +
          'dokploy.<module>.<method>(params) calls the Dokploy API. ' +
          'helpers: sleep(ms), assert(cond, msg), pick(obj, keys), limit(arr, n).',
      ),
    workflow: deployApplicationWorkflowSchema
      .optional()
      .describe(
        'Optional guided workflow mode. Currently supports `deploy-application` with interactive target resolution, preview/apply selection, bounded rollout options, and an MCP-native plan when phase 3 sampling and elicitation are enabled.',
      ),
    profile: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Dokploy profile name. Required when DOKPLOY_PROFILES_JSON configures multiple profiles.',
      ),
  })
  .strict()

type ExecuteToolInput = z.infer<typeof executeSchema>
type CallExecutor = (
  procedure: string,
  input?: Record<string, unknown>,
) => Promise<GatewayCallResult>

interface ExecuteToolOptions {
  server?: McpServer
  capabilityFlags?: McpCapabilityFlags
}

interface RunExecuteWithHostOptions {
  signal?: AbortSignal
  forceSubprocess?: boolean
}

export function buildExecuteContext(
  executor: CallExecutor,
  maxCalls = resolveSandboxLimits().maxCalls,
) {
  return createExecuteContext(executor, maxCalls)
}

export async function runExecuteWithHost(
  code: string,
  host: SandboxHost,
  options: RunExecuteWithHostOptions = {},
) {
  const execution =
    options.forceSubprocess === true || resolveSandboxRuntime() === 'subprocess'
      ? await runExecuteInSubprocess({
          code,
          signal: options.signal,
          onCall: async (procedure, input) => {
            const result = await host.call(procedure, input)
            return result.data
          },
        })
      : await runSandboxedFunction({
          code,
          context: (() => {
            const context = buildExecuteContext((procedure, payload) =>
              host.call(procedure, payload),
            )
            return {
              dokploy: context.dokploy,
              helpers: context.helpers,
            }
          })(),
        })

  const resourceLinks = listResourceLinks(execution.result)

  return {
    result: execution.result,
    logs: execution.logs,
    calls: host.getCalls(),
    ...(resourceLinks.length > 0 ? { resourceLinks } : {}),
  }
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function resolveExecuteRequest(input: ExecuteToolInput) {
  const hasCode = isNonEmptyString(input.code)
  const hasWorkflow = input.workflow !== undefined

  if (hasCode === hasWorkflow) {
    throw new Error('Provide exactly one of `code` or `workflow`.')
  }

  if (hasCode) {
    const code = input.code
    if (!code) {
      throw new Error('Execute code is required.')
    }

    return {
      kind: 'code' as const,
      code: code.trim(),
    }
  }

  return {
    kind: 'workflow' as const,
    workflow: input.workflow as DeployApplicationWorkflowInput,
  }
}

function wrapStructured(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    return { items: data }
  }

  if (data === null || data === undefined || typeof data !== 'object') {
    return { value: data }
  }

  return data as Record<string, unknown>
}

function buildToolSuccessResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: wrapStructured(data),
  }
}

function buildToolErrorResult(message: string, details?: string): CallToolResult {
  const payload = { error: message, ...(details ? { details } : {}) }

  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: true,
  }
}

function isTaskAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

async function safeGetTask(
  extra: Pick<CreateTaskRequestHandlerExtra | TaskRequestHandlerExtra, 'taskStore'>,
  taskId: string,
) {
  try {
    return await extra.taskStore.getTask(taskId)
  } catch {
    return null
  }
}

async function safeUpdateTaskStatus(
  extra: Pick<CreateTaskRequestHandlerExtra | TaskRequestHandlerExtra, 'taskStore'>,
  taskId: string,
  status: 'working' | 'input_required' | 'cancelled',
  statusMessage: string,
) {
  const task = await safeGetTask(extra, taskId)
  if (
    !task ||
    task.status === 'completed' ||
    task.status === 'failed' ||
    task.status === 'cancelled'
  ) {
    return
  }

  try {
    await extra.taskStore.updateTaskStatus(taskId, status, statusMessage)
  } catch {
    // Best-effort status update only.
  }
}

async function safeStoreTaskResult(
  extra: Pick<CreateTaskRequestHandlerExtra | TaskRequestHandlerExtra, 'taskStore'>,
  taskId: string,
  status: 'completed' | 'failed',
  result: CallToolResult,
) {
  const task = await safeGetTask(extra, taskId)
  if (
    !task ||
    task.status === 'completed' ||
    task.status === 'failed' ||
    task.status === 'cancelled'
  ) {
    return
  }

  try {
    await extra.taskStore.storeTaskResult(taskId, status, result)
  } catch {
    // Best-effort task result persistence only.
  }
}

function createExecuteTaskHandler(options: ExecuteToolOptions) {
  return {
    async createTask(input: ExecuteToolInput, extra: CreateTaskRequestHandlerExtra) {
      const request = resolveExecuteRequest(input)
      const selectedConfig = resolveProfileConfig(input.profile)
      const taskRuntime = options.server ? getTaskRuntime(options.server) : undefined
      const task = await extra.taskStore.createTask(
        taskRuntime?.createTaskOptions(extra.taskRequestedTtl, DEFAULT_TASK_POLL_INTERVAL_MS) ?? {
          ttl: 10 * 60 * 1000,
          pollInterval: DEFAULT_TASK_POLL_INTERVAL_MS,
        },
      )

      if (request.kind === 'code') {
        const controller = new AbortController()
        taskRuntime?.store.registerAbortController(task.taskId, controller)

        queueMicrotask(() => {
          void (async () => {
            try {
              await safeUpdateTaskStatus(
                extra,
                task.taskId,
                'working',
                'Running sandboxed execute code.',
              )
              const host = createSandboxHost({
                signal: controller.signal,
                onCallStart: async (procedure) => {
                  await safeUpdateTaskStatus(
                    extra,
                    task.taskId,
                    'working',
                    `Calling ${procedure} from execute task.`,
                  )
                },
              })
              const result = await withResolvedConfigOverride(selectedConfig, () =>
                runExecuteWithHost(request.code, host, {
                  signal: controller.signal,
                }),
              )
              await safeStoreTaskResult(
                extra,
                task.taskId,
                'completed',
                buildToolSuccessResult(result),
              )
            } catch (error) {
              if (isTaskAbortError(error)) {
                return
              }

              await safeStoreTaskResult(
                extra,
                task.taskId,
                'failed',
                buildToolErrorResult(
                  'Failed to execute execute',
                  getCodemodeErrorMessage(error, 'Unknown gateway error'),
                ),
              )
            }
          })()
        })

        return { task: (await extra.taskStore.getTask(task.taskId)) ?? task }
      }

      if (!options.server) {
        await safeStoreTaskResult(
          extra,
          task.taskId,
          'failed',
          buildToolErrorResult(
            'Failed to execute execute',
            'Guided execute workflows require a bound MCP server instance.',
          ),
        )
        return { task: (await extra.taskStore.getTask(task.taskId)) ?? task }
      }
      const server = options.server

      try {
        await safeUpdateTaskStatus(
          extra,
          task.taskId,
          'working',
          'Preparing guided deployment task.',
        )
        const prepared = await withResolvedConfigOverride(selectedConfig, () =>
          prepareDeployApplicationWorkflow(request.workflow, {
            server,
            capabilityFlags: options.capabilityFlags,
          }),
        )

        if (prepared.status === 'completed') {
          const payload = {
            result: prepared.result,
            calls: prepared.getCalls(),
            resourceLinks: listResourceLinks(prepared.result),
          }
          await safeStoreTaskResult(
            extra,
            task.taskId,
            'completed',
            buildToolSuccessResult(payload),
          )
          return { task: (await extra.taskStore.getTask(task.taskId)) ?? task }
        }

        const controller = new AbortController()
        taskRuntime?.store.registerAbortController(task.taskId, controller)

        queueMicrotask(() => {
          void (async () => {
            try {
              await safeUpdateTaskStatus(
                extra,
                task.taskId,
                'working',
                'Executing deploy workflow task against Dokploy.',
              )
              const result = await withResolvedConfigOverride(selectedConfig, () =>
                runPreparedDeployApplicationTask(prepared, controller.signal),
              )
              const payload = {
                result,
                calls: prepared.getCalls(),
                resourceLinks: listResourceLinks(result),
              }
              await safeStoreTaskResult(
                extra,
                task.taskId,
                'completed',
                buildToolSuccessResult(payload),
              )
            } catch (error) {
              if (isTaskAbortError(error)) {
                return
              }

              await safeStoreTaskResult(
                extra,
                task.taskId,
                'failed',
                buildToolErrorResult(
                  'Failed to execute execute',
                  getCodemodeErrorMessage(error, 'Unknown gateway error'),
                ),
              )
            }
          })()
        })

        return { task: (await extra.taskStore.getTask(task.taskId)) ?? task }
      } catch (error) {
        await safeStoreTaskResult(
          extra,
          task.taskId,
          'failed',
          buildToolErrorResult(
            'Failed to execute execute',
            getCodemodeErrorMessage(error, 'Unknown gateway error'),
          ),
        )
        return { task: (await extra.taskStore.getTask(task.taskId)) ?? task }
      }
    },
    async getTask(_input: ExecuteToolInput, extra: TaskRequestHandlerExtra) {
      return await extra.taskStore.getTask(extra.taskId)
    },
    async getTaskResult(_input: ExecuteToolInput, extra: TaskRequestHandlerExtra) {
      return (await extra.taskStore.getTaskResult(extra.taskId)) as CallToolResult
    },
  }
}

export function createExecuteTool(options: ExecuteToolOptions = {}): ToolDefinition {
  const tool = createTool({
    name: 'execute',
    title: 'Execute Dokploy Workflow',
    description:
      'Run JavaScript code or a guided Dokploy workflow. ' +
      'In code mode, write bare JS against global `dokploy` and `helpers` without wrapping it in a function. ' +
      'In workflow mode, `deploy-application` can resolve a target, choose preview vs apply, collect bounded rollout options, and build a bounded plan when sampling and elicitation are enabled. ' +
      'When MCP tasks are enabled, execute also supports polling and cancellation for long-running runs. ' +
      'Known Dokploy IDs yield reusable `dokploy://...` resource links, and `search` helps discover procedures.',
    schema: executeSchema,
    annotations: { openWorldHint: true },
    handler: async ({ input }) => {
      const request = resolveExecuteRequest(input)
      const selectedConfig = resolveProfileConfig(input.profile)
      if (request.kind === 'code') {
        const host = createSandboxHost()
        return withResolvedConfigOverride(selectedConfig, () =>
          runExecuteWithHost(request.code, host),
        )
      }

      if (!options.server) {
        throw new Error('Guided execute workflows require a bound MCP server instance.')
      }
      const server = options.server

      return withResolvedConfigOverride(selectedConfig, () =>
        runDeployApplicationWorkflow(request.workflow, {
          server,
          capabilityFlags: options.capabilityFlags,
        }),
      )
    },
  })

  return {
    ...tool,
    execution: {
      taskSupport: 'optional',
    },
    taskHandler: createExecuteTaskHandler(options),
  }
}

export const executeTool = createExecuteTool()
