import { createExecuteContext } from '../context/execute-context.js'
import { createSearchCatalogView } from '../context/search-context.js'
import { getCodemodeErrorMessage, normalizeCodemodeError } from '../error-message.js'
import type { GatewayCallResult } from '../gateway/api-gateway.js'
import { normalizeSandboxLimits, resolveSandboxLimits } from './limits.js'
import { runSandboxedFunction } from './runner.js'

const pendingCalls = new Map<
  number,
  {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }
>()

let requestIdCounter = 0
let workerRunState: 'idle' | 'running' = 'idle'

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

function buildInvalidCallResultError() {
  return new Error('Sandbox worker received an invalid procedure call result.')
}

function buildDisconnectedCallResultError() {
  return new Error(
    'Sandbox worker IPC channel disconnected before a procedure call result was received.',
  )
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

function buildDuplicateRunError() {
  return 'Sandbox worker received a duplicate run payload.'
}

function buildInvalidLimitsError() {
  return 'Invalid sandbox worker limits payload.'
}

function normalizeWorkerError(error: unknown) {
  return normalizeCodemodeError(error, 'Sandbox worker error')
}

function formatWorkerError(error: unknown) {
  return normalizeWorkerError(error).message
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

function rejectPendingCalls(error: Error) {
  const pendingEntries = [...pendingCalls.values()]
  pendingCalls.clear()

  for (const pending of pendingEntries) {
    pending.reject(error)
  }
}

function handleCallResultMessage(payload: Record<string, unknown>) {
  if (payload.type === 'callResult') {
    if (!Number.isInteger(payload.requestId) || typeof payload.ok !== 'boolean') {
      rejectPendingCalls(buildInvalidCallResultError())
      return true
    }

    const requestId = Number(payload.requestId)
    const pending = pendingCalls.get(requestId)
    if (!pending) {
      return true
    }

    pendingCalls.delete(requestId)
    if (payload.ok === true) {
      pending.resolve(payload.data)
    } else {
      pending.reject(normalizeCodemodeError(payload.error, 'Unknown gateway error'))
    }
    return true
  }

  return false
}

async function reportWorkerFailure(error: string) {
  try {
    await sendDoneMessage(false, { error })
  } catch {
    // The worker cannot report the failure if the IPC channel is already broken.
  }
}

async function handleUnexpectedWorkerMessageError(error: unknown) {
  workerRunState = 'idle'
  rejectPendingCalls(normalizeWorkerError(error))
  await reportWorkerFailure(`Sandbox worker message handling failed: ${formatWorkerError(error)}`)
}

function resolveRunLimits(payload: Record<string, unknown>) {
  return payload.limits === undefined
    ? resolveSandboxLimits()
    : normalizeSandboxLimits(payload.limits)
}

function createRpcExecutor() {
  return async (procedure: string, input?: Record<string, unknown>): Promise<GatewayCallResult> => {
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
}

function createRunContext(
  payload: Record<string, unknown> & { mode: 'search' | 'execute' },
  maxCalls: number,
) {
  if (payload.mode === 'search') {
    return { catalog: createSearchCatalogView() }
  }

  const ctx = createExecuteContext(createRpcExecutor(), maxCalls)
  return {
    dokploy: ctx.dokploy,
    helpers: ctx.helpers,
  }
}

async function handleRunMessage(payload: Record<string, unknown>) {
  if (workerRunState !== 'idle') {
    await reportWorkerFailure(buildDuplicateRunError())
    return
  }

  if (!isValidRunPayload(payload)) {
    await reportWorkerFailure('Invalid sandbox worker run payload.')
    return
  }

  const limits = resolveRunLimits(payload)
  if (!limits) {
    await reportWorkerFailure(buildInvalidLimitsError())
    return
  }

  workerRunState = 'running'
  requestIdCounter = 0

  try {
    const context = createRunContext(payload, limits.maxCalls)
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
    await reportWorkerFailure(getCodemodeErrorMessage(error, 'Sandbox worker execution failed'))
  } finally {
    workerRunState = 'idle'
  }
}

async function handleWorkerMessage(message: unknown) {
  if (!isRecord(message)) {
    return
  }

  const payload = message

  if (handleCallResultMessage(payload)) {
    return
  }

  if (payload.type !== 'run') {
    return
  }

  await handleRunMessage(payload)
}

process.on('message', (message: unknown) => {
  void handleWorkerMessage(message).catch((error) => {
    void handleUnexpectedWorkerMessageError(error)
  })
})

process.on('disconnect', () => {
  rejectPendingCalls(buildDisconnectedCallResultError())
})
