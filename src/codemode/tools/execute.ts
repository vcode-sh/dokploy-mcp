import { z } from 'zod'

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

const executeSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .describe(
        'JavaScript code. `dokploy` and `helpers` are globals -- do NOT wrap in a function. ' +
          'Simple: `await dokploy.project.all()`. ' +
          'Multi-step: `const app = await dokploy.application.one({ applicationId: "abc" }); return app.name`. ' +
          'dokploy.<module>.<method>(params) calls the Dokploy API. ' +
          'helpers: sleep(ms), assert(cond, msg), pick(obj, keys), limit(arr, n).',
      ),
  })
  .strict()

type CallExecutor = (
  procedure: string,
  input?: Record<string, unknown>,
) => Promise<GatewayCallResult>

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

export const executeTool: ToolDefinition = createTool({
  name: 'execute',
  title: 'Execute Dokploy Workflow',
  description:
    'Run JavaScript code against the Dokploy API. ' +
    'IMPORTANT: Do NOT wrap code in a function -- `dokploy` and `helpers` are already globals. ' +
    'Write bare code: `await dokploy.project.all()` or `const x = await dokploy.application.one({ applicationId: "id" }); return x`. ' +
    'Common reads: `application.one` returns application detail fields such as status, mounts, domains, and deployments, and supports optional `select`, `includeDeployments`, and `deploymentLimit`; `application.many` batches several shaped application reads; `project.overview` returns a compact per-environment and per-application state view; `deployment.all` returns deployment history entries. ' +
    'When the result contains known Dokploy IDs, the tool also returns reusable `dokploy://...` resource links for follow-up inspection. ' +
    'dokploy.<module>.<method>(params) calls the API. ' +
    'Modules: project, environment, application, compose, domain, postgres, mysql, mariadb, mongo, redis, ' +
    'deployment, docker, server, settings, user, notification, backup, mounts, registry, certificates, schedule, patch, sshKey, gitProvider, and more. ' +
    'Use search tool first to discover procedure names and required parameters.',
  schema: executeSchema,
  annotations: { openWorldHint: true },
  handler: async ({ input }) => {
    const host = createSandboxHost()
    return runExecuteWithHost(input.code, host)
  },
})
