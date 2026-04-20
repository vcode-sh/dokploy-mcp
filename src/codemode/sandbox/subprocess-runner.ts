import { fork } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveSandboxLimits } from './limits.js'
import type { SandboxExecutionResult, SandboxLimits } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultWorkerPath = resolve(__dirname, '../../../dist/codemode/sandbox/worker-entry.js')
const testWorkerModeEnvName = 'DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE'

interface WorkerDoneMessage {
  type: 'done'
  ok: boolean
  result?: unknown
  logs?: string[]
  error?: string
}

interface WorkerCallMessage {
  type: 'call'
  requestId: number
  procedure: string
  input?: Record<string, unknown>
}

const SUBPROCESS_TIMEOUT_GRACE_MS = 100

function resolveWorkerPath() {
  const overridePath = process.env.DOKPLOY_MCP_SANDBOX_WORKER_PATH?.trim()
  if (!overridePath) {
    return defaultWorkerPath
  }

  return resolve(overridePath)
}

function createWorker() {
  return fork(resolveWorkerPath(), {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: resolveWorkerEnv(),
    execArgv: [],
  })
}

function resolveWorkerEnv() {
  const testWorkerMode = process.env[testWorkerModeEnvName]?.trim()

  if (!testWorkerMode) {
    return {}
  }

  // Keep the subprocess environment empty by default while still allowing the
  // test harness to switch reusable fixture workers by explicit opt-in.
  return {
    [testWorkerModeEnvName]: testWorkerMode,
  }
}

function resolveLimits(limits?: SandboxLimits) {
  return limits ?? resolveSandboxLimits()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isWorkerDoneMessage(message: unknown): message is WorkerDoneMessage {
  if (!isRecord(message) || message.type !== 'done' || typeof message.ok !== 'boolean') {
    return false
  }

  if ('logs' in message && message.logs !== undefined && !isStringArray(message.logs)) {
    return false
  }

  if ('error' in message && message.error !== undefined && typeof message.error !== 'string') {
    return false
  }

  return true
}

function isWorkerCallMessage(message: unknown): message is WorkerCallMessage {
  if (!isRecord(message) || message.type !== 'call') {
    return false
  }

  if (!Number.isInteger(message.requestId) || typeof message.procedure !== 'string') {
    return false
  }

  if (
    'input' in message &&
    message.input !== undefined &&
    (!isRecord(message.input) || Array.isArray(message.input))
  ) {
    return false
  }

  return true
}

function terminateWorker(worker: ReturnType<typeof createWorker>) {
  try {
    if (worker.connected) {
      worker.disconnect()
    }
  } catch {
    // Best-effort cleanup only.
  }

  try {
    worker.kill()
  } catch {
    // Best-effort cleanup only.
  }
}

function buildInvalidMessageError() {
  return new Error('Sandbox worker sent an invalid message.')
}

function buildExitError(code: number | null, signal: NodeJS.Signals | null) {
  if (typeof code === 'number' && code !== 0) {
    return new Error(`Sandbox worker exited with code ${code}.`)
  }

  if (signal) {
    return new Error(`Sandbox worker exited before completing (signal ${signal}).`)
  }

  return new Error('Sandbox worker exited before completing.')
}

function buildTimeoutError(timeoutMs: number) {
  return new Error(`Sandbox subprocess timed out after ${timeoutMs}ms.`)
}

function buildCallResultSerializationError() {
  return 'Sandbox call result could not be serialized for IPC.'
}

function cleanupWorker(
  worker: ReturnType<typeof createWorker>,
  timeoutId: NodeJS.Timeout | undefined,
  terminate = false,
) {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }

  worker.removeAllListeners()

  if (terminate) {
    terminateWorker(worker)
  }
}

function createSettlers(
  worker: ReturnType<typeof createWorker>,
  resolvePromise: (value: SandboxExecutionResult) => void,
  rejectPromise: (reason?: unknown) => void,
  timeoutId: NodeJS.Timeout | undefined,
) {
  let settled = false

  return {
    resolve(payload: WorkerDoneMessage) {
      if (settled) {
        return
      }

      settled = true
      cleanupWorker(worker, timeoutId, true)
      resolvePromise({
        result: payload.result,
        logs: payload.logs ?? [],
      })
    },
    reject(reason: unknown, terminate = true) {
      if (settled) {
        return
      }

      settled = true
      cleanupWorker(worker, timeoutId, terminate)
      rejectPromise(reason)
    },
  }
}

function finishWorker(payload: WorkerDoneMessage, settle: ReturnType<typeof createSettlers>) {
  if (payload.ok) {
    settle.resolve(payload)
  } else {
    settle.reject(new Error(payload.error ?? 'Unknown sandbox subprocess error'))
  }
}

function sendInitialRunMessage(
  worker: ReturnType<typeof createWorker>,
  settle: ReturnType<typeof createSettlers>,
  payload: {
    type: 'run'
    mode: 'search' | 'execute'
    code: string
    limits: SandboxLimits
  },
) {
  try {
    worker.send(payload)
  } catch (error) {
    settle.reject(error)
  }
}

function sendExecuteCallError(
  worker: ReturnType<typeof createWorker>,
  settle: ReturnType<typeof createSettlers>,
  requestId: number,
  error: string,
) {
  try {
    worker.send({
      type: 'callResult',
      requestId,
      ok: false,
      error,
    })
  } catch (fallbackError) {
    settle.reject(fallbackError)
  }
}

function sendExecuteCallResult(
  worker: ReturnType<typeof createWorker>,
  settle: ReturnType<typeof createSettlers>,
  requestId: number,
  data: unknown,
) {
  try {
    worker.send({ type: 'callResult', requestId, ok: true, data })
  } catch {
    sendExecuteCallError(worker, settle, requestId, buildCallResultSerializationError())
  }
}

async function handleExecuteWorkerMessage(
  worker: ReturnType<typeof createWorker>,
  settle: ReturnType<typeof createSettlers>,
  message: unknown,
  onCall: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>,
) {
  if (isWorkerCallMessage(message)) {
    try {
      const data = await onCall(message.procedure, message.input ?? {})
      sendExecuteCallResult(worker, settle, message.requestId, data)
    } catch (error) {
      sendExecuteCallError(
        worker,
        settle,
        message.requestId,
        error instanceof Error ? error.message : String(error ?? 'Unknown gateway error'),
      )
    }
    return
  }

  if (!isWorkerDoneMessage(message)) {
    settle.reject(buildInvalidMessageError())
    return
  }

  finishWorker(message, settle)
}

export async function runSearchInSubprocess(options: {
  code: string
  limits?: SandboxLimits
}): Promise<SandboxExecutionResult> {
  const limits = resolveLimits(options.limits)

  return new Promise((resolvePromise, rejectPromise) => {
    const worker = createWorker()
    const timeoutId = setTimeout(() => {
      settle.reject(buildTimeoutError(limits.timeoutMs))
    }, limits.timeoutMs + SUBPROCESS_TIMEOUT_GRACE_MS)
    const settle = createSettlers(worker, resolvePromise, rejectPromise, timeoutId)

    timeoutId.unref?.()

    worker.on('message', (message: unknown) => {
      if (!isWorkerDoneMessage(message)) {
        settle.reject(buildInvalidMessageError())
        return
      }

      finishWorker(message, settle)
    })

    worker.on('error', (error) => settle.reject(error))
    worker.on('exit', (code, signal) => settle.reject(buildExitError(code, signal), false))

    sendInitialRunMessage(worker, settle, {
      type: 'run',
      mode: 'search',
      code: options.code,
      limits,
    })
  })
}

export async function runExecuteInSubprocess(options: {
  code: string
  limits?: SandboxLimits
  onCall: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
}): Promise<SandboxExecutionResult> {
  const limits = resolveLimits(options.limits)

  return new Promise((resolvePromise, rejectPromise) => {
    const worker = createWorker()
    const timeoutId = setTimeout(() => {
      settle.reject(buildTimeoutError(limits.timeoutMs))
    }, limits.timeoutMs + SUBPROCESS_TIMEOUT_GRACE_MS)
    const settle = createSettlers(worker, resolvePromise, rejectPromise, timeoutId)

    timeoutId.unref?.()

    worker.on('message', (message: unknown) => {
      void handleExecuteWorkerMessage(worker, settle, message, options.onCall)
    })

    worker.on('error', (error) => settle.reject(error))
    worker.on('exit', (code, signal) => settle.reject(buildExitError(code, signal), false))

    sendInitialRunMessage(worker, settle, {
      type: 'run',
      mode: 'execute',
      code: options.code,
      limits,
    })
  })
}
