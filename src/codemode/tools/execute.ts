import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import type { McpCapabilityFlags } from '../../mcp/registration/types.js'
import { listResourceLinks } from '../../mcp/resources/resource-links.js'
import { createTool, type ToolDefinition } from '../../mcp/tool-factory.js'
import { createExecuteContext } from '../context/execute-context.js'
import type { GatewayCallResult } from '../gateway/api-gateway.js'
import type { SandboxHost } from '../sandbox/host.js'
import { createSandboxHost } from '../sandbox/host.js'
import { resolveSandboxLimits } from '../sandbox/limits.js'
import { runSandboxedFunction } from '../sandbox/runner.js'
import { resolveSandboxRuntime } from '../sandbox/runtime.js'
import { runExecuteInSubprocess } from '../sandbox/subprocess-runner.js'
import {
  type DeployApplicationWorkflowInput,
  runDeployApplicationWorkflow,
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
        'Optional guided workflow mode. Currently supports `deploy-application` with interactive target resolution, preview/apply selection, bounded rollout options, and an MCP-native plan when phase 3 capabilities are enabled.',
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

export function buildExecuteContext(
  executor: CallExecutor,
  maxCalls = resolveSandboxLimits().maxCalls,
) {
  return createExecuteContext(executor, maxCalls)
}

export async function runExecuteWithHost(code: string, host: SandboxHost) {
  const execution =
    resolveSandboxRuntime() === 'subprocess'
      ? await runExecuteInSubprocess({
          code,
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

export function createExecuteTool(options: ExecuteToolOptions = {}): ToolDefinition {
  return createTool({
    name: 'execute',
    title: 'Execute Dokploy Workflow',
    description:
      'Run JavaScript code or a guided workflow against the Dokploy API. ' +
      'For code mode: do NOT wrap code in a function -- `dokploy` and `helpers` are already globals. ' +
      'Write bare code like `await dokploy.project.all()` or `const x = await dokploy.application.one({ applicationId: "id" }); return x`. ' +
      'For guided mode: pass `workflow`, currently `deploy-application`, to resolve missing targets, choose preview vs apply, gather bounded rollout options, and synthesize a bounded deployment plan when phase 3 sampling and elicitation are enabled. ' +
      'When the result contains known Dokploy IDs, the tool also returns reusable `dokploy://...` resource links for follow-up inspection. ' +
      'dokploy.<module>.<method>(params) calls the API. ' +
      'Modules: project, environment, application, compose, domain, postgres, mysql, mariadb, mongo, redis, ' +
      'deployment, docker, server, settings, user, notification, backup, mounts, registry, certificates, schedule, patch, sshKey, gitProvider, and more. ' +
      'Use the search tool first to discover procedures when you stay in raw code mode.',
    schema: executeSchema,
    annotations: { openWorldHint: true },
    handler: async ({ input }) => {
      const request = resolveExecuteRequest(input)
      if (request.kind === 'code') {
        const host = createSandboxHost()
        return runExecuteWithHost(request.code, host)
      }

      if (!options.server) {
        throw new Error('Guided execute workflows require a bound MCP server instance.')
      }

      return runDeployApplicationWorkflow(request.workflow, {
        server: options.server,
        capabilityFlags: options.capabilityFlags,
      })
    },
  })
}

export const executeTool = createExecuteTool()
