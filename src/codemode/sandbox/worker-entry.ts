import { createGeneratedDokployRuntime } from '../../generated/dokploy-sdk.js'
import { buildHelpers } from '../context/execute-context.js'
import { createSearchCatalogView } from '../context/search-context.js'
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
        : {
            dokploy: createGeneratedDokployRuntime(rpcCall),
            helpers: buildHelpers(),
          }

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
