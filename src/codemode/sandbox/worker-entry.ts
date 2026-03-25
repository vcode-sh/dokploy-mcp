import { createExecuteContext } from '../context/execute-context.js'
import type { GatewayCallResult } from '../gateway/api-gateway.js'
import { createSearchCatalogView } from '../context/search-context.js'
import { runSandboxedFunction } from './runner.js'
import { resolveSandboxLimits } from './limits.js'
import type { SandboxLimits } from './types.js'

const pendingCalls = new Map<
  number,
  {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }
>()

let requestIdCounter = 0

function rpcCall(procedure: string, input: Record<string, unknown> = {}) {
  return new Promise((resolve, reject) => {
    requestIdCounter += 1
    const requestId = requestIdCounter
    pendingCalls.set(requestId, {
      resolve,
      reject,
    })

    process.send?.({
      type: 'call',
      requestId,
      procedure,
      input,
    })
  })
}

process.on('message', async (message: unknown) => {
  const payload = message as Record<string, unknown>

  if (payload.type === 'callResult') {
    const requestId = Number(payload.requestId)
    const pending = pendingCalls.get(requestId)
    if (!pending) {
      return
    }

    pendingCalls.delete(requestId)
    if (payload.ok === true) {
      pending.resolve(payload.data)
    } else {
      pending.reject(new Error(String(payload.error ?? 'Unknown gateway error')))
    }
    return
  }

  if (payload.type !== 'run') {
    return
  }

  try {
    const limits = (payload.limits as SandboxLimits | undefined) ?? undefined
    const context =
      payload.mode === 'search'
        ? { catalog: createSearchCatalogView() }
        : (() => {
            const rpcExecutor = async (
              procedure: string,
              input?: Record<string, unknown>,
            ): Promise<GatewayCallResult> => {
              const data = await rpcCall(procedure, input ?? {})
              return {
                data: data as Record<string, unknown>,
                trace: {
                  procedure,
                  method: 'GET' as const,
                  startedAt: Date.now(),
                  finishedAt: Date.now(),
                  durationMs: 0,
                },
              }
            }
            const maxCalls = limits?.maxCalls ?? resolveSandboxLimits().maxCalls
            const ctx = createExecuteContext(rpcExecutor, maxCalls)
            return {
              dokploy: ctx.dokploy,
              helpers: ctx.helpers,
            }
          })()

    const execution = await runSandboxedFunction({
      code: String(payload.code),
      context,
      limits,
    })

    process.send?.({
      type: 'done',
      ok: true,
      result: execution.result,
      logs: execution.logs,
    })
  } catch (error) {
    process.send?.({
      type: 'done',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
