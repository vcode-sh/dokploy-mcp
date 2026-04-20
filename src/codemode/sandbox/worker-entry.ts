import { createExecuteContext } from '../context/execute-context.js'
import { createSearchCatalogView } from '../context/search-context.js'
import type { GatewayCallResult } from '../gateway/api-gateway.js'
import { resolveSandboxLimits } from './limits.js'
import { runSandboxedFunction } from './runner.js'
import type { SandboxLimits } from './types.js'

const pendingCalls = new Map<
  number,
  {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }
>()

let requestIdCounter = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sendProcessMessage(message: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    if (!process.send) {
      reject(new Error('Sandbox worker IPC channel is unavailable.'))
      return
    }

    process.send(message, (error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

function sendDoneMessage(ok: boolean, payload: Record<string, unknown>) {
  return sendProcessMessage({
    type: 'done',
    ok,
    ...payload,
  })
}

function isValidRunPayload(
  payload: Record<string, unknown>,
): payload is Record<string, unknown> & { type: 'run'; mode: 'search' | 'execute'; code: string } {
  return (
    payload.type === 'run' &&
    (payload.mode === 'search' || payload.mode === 'execute') &&
    typeof payload.code === 'string'
  )
}

function rpcCall(procedure: string, input: Record<string, unknown> = {}) {
  return new Promise((resolve, reject) => {
    requestIdCounter += 1
    const requestId = requestIdCounter
    pendingCalls.set(requestId, {
      resolve,
      reject,
    })

    void sendProcessMessage({
      type: 'call',
      requestId,
      procedure,
      input,
    }).catch((error) => {
      pendingCalls.delete(requestId)
      reject(
        new Error(
          `Sandbox worker failed to send procedure call: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      )
    })
  })
}

process.on('message', async (message: unknown) => {
  if (!isRecord(message)) {
    return
  }

  const payload = message

  if (payload.type === 'callResult') {
    if (!Number.isInteger(payload.requestId) || typeof payload.ok !== 'boolean') {
      return
    }

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

  if (!isValidRunPayload(payload)) {
    await sendDoneMessage(false, {
      error: 'Invalid sandbox worker run payload.',
    })
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
      code: payload.code,
      context,
      limits,
    })

    await sendDoneMessage(true, {
      result: execution.result,
      logs: execution.logs,
    })
  } catch (error) {
    try {
      await sendDoneMessage(false, {
        error: error instanceof Error ? error.message : String(error),
      })
    } catch {
      // The worker cannot report the failure if the IPC channel is already broken.
    }
  }
})
