import { z } from 'zod'

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
        'JavaScript code to run. Can be a simple expression, statements, or an async function. ' +
          'dokploy and helpers are available as globals. ' +
          'Examples: ' +
          '`await dokploy.project.all()` | ' +
          '`const app = await dokploy.application.one({ applicationId: "id" }); return app.name` | ' +
          '`async ({ dokploy }) => dokploy.settings.health()`. ' +
          'dokploy.<module>.<method>(params) calls the Dokploy API. ' +
          'helpers: sleep(ms), assert(cond, msg), pick(obj, keys), limit(arr, n), selectOne(arr, pred).',
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

  return {
    result: execution.result,
    logs: execution.logs,
    calls: host.getCalls(),
  }
}

export const executeTool: ToolDefinition = createTool({
  name: 'execute',
  title: 'Execute Dokploy Workflow',
  description:
    'Run JavaScript code against the Dokploy API. ' +
    '`dokploy` and `helpers` are available as globals -- no wrapper function needed. ' +
    'Just write: `await dokploy.project.all()` or multi-line with `const`/`return`. ' +
    'dokploy.<module>.<method>(params) calls the API. ' +
    'Modules: project, environment, application, compose, domain, postgres, mysql, mariadb, mongo, redis, ' +
    'deployment, docker, server, settings, user, notification, backup, mounts, registry, certificates, and more. ' +
    'Use search tool first to discover procedure names and required parameters.',
  schema: executeSchema,
  annotations: { openWorldHint: true },
  handler: async ({ input }) => {
    const host = createSandboxHost()
    return runExecuteWithHost(input.code, host)
  },
})
