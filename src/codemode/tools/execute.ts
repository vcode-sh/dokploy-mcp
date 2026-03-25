import { z } from 'zod'

import { createTool, type ToolDefinition } from '../../tools/_factory.js'
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
    code: z.string().min(1).describe('Async JavaScript function to execute a Dokploy workflow'),
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
  description: 'Execute a sandboxed Dokploy workflow against the generated Dokploy SDK.',
  schema: executeSchema,
  annotations: { openWorldHint: true },
  handler: async ({ input }) => {
    const host = createSandboxHost()
    return runExecuteWithHost(input.code, host)
  },
})
