import { fork } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getCodemodeErrorMessage, normalizeCodemodeError } from '../error-message.js'
import { acquireSandboxSlot } from './concurrency.js'
import { normalizeSandboxLimits, resolveSandboxLimits } from './limits.js'
import type { SandboxExecutionResult, SandboxLimits } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultWorkerPath = resolve(__dirname, '../../../dist/codemode/sandbox/worker-entry.js')
const testWorkerModeEnvName = 'DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE'
const workerMemoryMbEnvName = 'DOKPLOY_MCP_SANDBOX_WORKER_MEMORY_MB'

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

interface WorkerLaunchOptions {
  workerPath?: string
  workerEnv?: NodeJS.ProcessEnv
}

const SUBPROCESS_TIMEOUT_GRACE_MS = 100
const DEFAULT_WORKER_MAX_OLD_SPACE_MB = 256
const workerReuseEnvName = 'DOKPLOY_MCP_SANDBOX_WORKER_REUSE'
type WorkerMode = 'search' | 'execute'
type WorkerProcess = ReturnType<typeof createWorker>
const reusableWorkers = new Map<WorkerMode, WorkerProcess>()

function resolveWorkerPath(workerPath?: string) {
  const overridePath = workerPath?.trim() || process.env.DOKPLOY_MCP_SANDBOX_WORKER_PATH?.trim()
  if (!overridePath) {
    return defaultWorkerPath
  }

  return resolve(overridePath)
}

function createWorker(options: WorkerLaunchOptions = {}) {
  return fork(resolveWorkerPath(options.workerPath), {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: resolveWorkerEnv(options.workerEnv),
    execArgv: [`--max-old-space-size=${resolveWorkerMaxOldSpaceMb()}`],
  })
}

function createWorkerForMode(mode: WorkerMode, options: WorkerLaunchOptions = {}) {
  if (!isWorkerReuseEnabled()) {
    return createWorker(options)
  }

  const reusableWorker = reusableWorkers.get(mode)
  reusableWorkers.delete(mode)

  if (!reusableWorker?.connected) {
    return createWorker(options)
  }

  reusableWorker.removeAllListeners()
  return reusableWorker
}

function isWorkerReuseEnabled() {
  const value = process.env[workerReuseEnvName]?.trim().toLowerCase()
  return value === '1' || value === 'true'
}

function cacheReusableWorker(mode: WorkerMode, worker: WorkerProcess) {
  if (!(isWorkerReuseEnabled() && worker.connected)) {
    terminateWorker(worker)
    return
  }

  const previous = reusableWorkers.get(mode)
  if (previous && previous !== worker) {
    terminateWorker(previous)
  }

  reusableWorkers.set(mode, worker)
  const removeCachedWorker = () => {
    if (reusableWorkers.get(mode) === worker) {
      reusableWorkers.delete(mode)
    }
  }
  worker.once('disconnect', removeCachedWorker)
  worker.once('exit', removeCachedWorker)
  worker.once('error', removeCachedWorker)
}

function resolveWorkerMaxOldSpaceMb() {
  const parsed = Number.parseInt(process.env[workerMemoryMbEnvName] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WORKER_MAX_OLD_SPACE_MB
}

function resolveWorkerEnv(workerEnv?: NodeJS.ProcessEnv) {
  if (workerEnv) {
    return workerEnv
  }

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
  const normalizedLimits = normalizeSandboxLimits(limits)
  if (!normalizedLimits) {
    throw new Error('Sandbox limits payload must be an object when provided.')
  }

  return limits === undefined ? resolveSandboxLimits() : normalizedLimits
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

function buildDisconnectError() {
  return new Error('Sandbox worker IPC channel disconnected before completing.')
}

function buildAbortError() {
  const error = new Error('Sandbox subprocess was aborted.')
  error.name = 'AbortError'
  return error
}

function buildCallResultSerializationError() {
  return 'Sandbox call result could not be serialized for IPC.'
}

function buildCallResultTransportError(error: Error) {
  return new Error(
    `Sandbox worker IPC channel failed while sending a procedure call result: ${error.message}`,
  )
}

function normalizeError(error: unknown) {
  return normalizeCodemodeError(error, 'Unknown subprocess error')
}

function isLikelySerializationError(error: Error) {
  const message = error.message.toLowerCase()
  return (
    message.includes('serialize') ||
    message.includes('serialization') ||
    message.includes('bigint') ||
    message.includes('circular')
  )
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
  reuseMode?: WorkerMode,
) {
  let settled = false

  return {
    isSettled() {
      return settled
    },
    resolve(payload: WorkerDoneMessage) {
      if (settled) {
        return
      }

      settled = true
      cleanupWorker(worker, timeoutId, reuseMode === undefined)
      if (reuseMode !== undefined) {
        cacheReusableWorker(reuseMode, worker)
      }
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
  sendWorkerMessage(worker, settle, payload)
}

function sendExecuteCallError(
  worker: ReturnType<typeof createWorker>,
  settle: ReturnType<typeof createSettlers>,
  requestId: number,
  error: string,
) {
  sendWorkerMessage(worker, settle, {
    type: 'callResult',
    requestId,
    ok: false,
    error,
  })
}

function sendExecuteCallResult(
  worker: ReturnType<typeof createWorker>,
  settle: ReturnType<typeof createSettlers>,
  requestId: number,
  data: unknown,
) {
  if (settle.isSettled()) {
    return
  }

  sendWorkerMessage(worker, settle, { type: 'callResult', requestId, ok: true, data }, (error) => {
    if (isLikelySerializationError(error)) {
      sendExecuteCallError(worker, settle, requestId, buildCallResultSerializationError())
      return
    }

    settle.reject(buildCallResultTransportError(error))
  })
}

function sendWorkerMessage(
  worker: ReturnType<typeof createWorker>,
  settle: ReturnType<typeof createSettlers>,
  message: Record<string, unknown>,
  onError?: (error: Error) => void,
) {
  if (settle.isSettled()) {
    return
  }

  const handleError = onError ?? ((error: Error) => settle.reject(error))

  try {
    worker.send(message, (error) => {
      if (!error) {
        return
      }

      handleError(normalizeError(error))
    })
  } catch (error) {
    handleError(normalizeError(error))
  }
}

function rejectUnexpectedWorkerMessageError(
  settle: ReturnType<typeof createSettlers>,
  error: unknown,
) {
  settle.reject(normalizeError(error))
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
      if (settle.isSettled()) {
        return
      }

      sendExecuteCallResult(worker, settle, message.requestId, data)
    } catch (error) {
      if (settle.isSettled()) {
        return
      }

      sendExecuteCallError(
        worker,
        settle,
        message.requestId,
        getCodemodeErrorMessage(error, 'Unknown gateway error'),
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
  workerPath?: string
  workerEnv?: NodeJS.ProcessEnv
}): Promise<SandboxExecutionResult> {
  const slot = await acquireSandboxSlot()
  try {
    return await runSearchInSubprocessUnbounded(options)
  } finally {
    slot.release()
  }
}

async function runSearchInSubprocessUnbounded(options: {
  code: string
  limits?: SandboxLimits
  workerPath?: string
  workerEnv?: NodeJS.ProcessEnv
}): Promise<SandboxExecutionResult> {
  const limits = resolveLimits(options.limits)

  return new Promise((resolvePromise, rejectPromise) => {
    const worker = createWorkerForMode('search', {
      workerPath: options.workerPath,
      workerEnv: options.workerEnv,
    })
    const timeoutId = setTimeout(() => {
      settle.reject(buildTimeoutError(limits.timeoutMs))
    }, limits.timeoutMs + SUBPROCESS_TIMEOUT_GRACE_MS)
    const settle = createSettlers(worker, resolvePromise, rejectPromise, timeoutId, 'search')

    timeoutId.unref?.()

    worker.on('message', (message: unknown) => {
      try {
        if (!isWorkerDoneMessage(message)) {
          settle.reject(buildInvalidMessageError())
          return
        }

        finishWorker(message, settle)
      } catch (error) {
        rejectUnexpectedWorkerMessageError(settle, error)
      }
    })

    worker.on('error', (error) => settle.reject(normalizeError(error)))
    worker.on('disconnect', () => settle.reject(buildDisconnectError()))
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
  signal?: AbortSignal
  workerPath?: string
  workerEnv?: NodeJS.ProcessEnv
}): Promise<SandboxExecutionResult> {
  const slot = await acquireSandboxSlot(options.signal)
  try {
    return await runExecuteInSubprocessUnbounded(options)
  } finally {
    slot.release()
  }
}

async function runExecuteInSubprocessUnbounded(options: {
  code: string
  limits?: SandboxLimits
  onCall: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
  signal?: AbortSignal
  workerPath?: string
  workerEnv?: NodeJS.ProcessEnv
}): Promise<SandboxExecutionResult> {
  const limits = resolveLimits(options.limits)

  return new Promise((resolvePromise, rejectPromise) => {
    const worker = createWorkerForMode('execute', {
      workerPath: options.workerPath,
      workerEnv: options.workerEnv,
    })
    let pendingCallResults = 0
    let receivedCallMessage = false
    let cleanupAbortListener: (() => void) | undefined
    const resolveWithCleanup = (value: SandboxExecutionResult) => {
      cleanupAbortListener?.()
      resolvePromise(value)
    }
    const rejectWithCleanup = (reason?: unknown) => {
      cleanupAbortListener?.()
      rejectPromise(reason)
    }
    const timeoutId = setTimeout(() => {
      settle.reject(buildTimeoutError(limits.timeoutMs))
    }, limits.timeoutMs + SUBPROCESS_TIMEOUT_GRACE_MS)
    const settle = createSettlers(
      worker,
      resolveWithCleanup,
      rejectWithCleanup,
      timeoutId,
      'execute',
    )

    if (options.signal) {
      const onAbort = () => {
        settle.reject(buildAbortError())
      }

      if (options.signal.aborted) {
        onAbort()
      } else {
        options.signal.addEventListener('abort', onAbort, { once: true })
        cleanupAbortListener = () => {
          options.signal?.removeEventListener('abort', onAbort)
        }
      }
    }

    timeoutId.unref?.()

    worker.on('message', (message: unknown) => {
      const tracksCallResult = isWorkerCallMessage(message)
      if (tracksCallResult) {
        receivedCallMessage = true
        pendingCallResults += 1
      }

      void handleExecuteWorkerMessage(worker, settle, message, options.onCall)
        .catch((error) => {
          rejectUnexpectedWorkerMessageError(settle, error)
        })
        .finally(() => {
          if (tracksCallResult) {
            pendingCallResults = Math.max(0, pendingCallResults - 1)
          }
        })
    })

    worker.on('error', (error) => settle.reject(normalizeError(error)))
    worker.on('disconnect', () =>
      settle.reject(
        pendingCallResults > 0 || receivedCallMessage
          ? buildCallResultTransportError(new Error(buildDisconnectError().message))
          : buildDisconnectError(),
      ),
    )
    worker.on('exit', (code, signal) => settle.reject(buildExitError(code, signal), false))

    sendInitialRunMessage(worker, settle, {
      type: 'run',
      mode: 'execute',
      code: options.code,
      limits,
    })
  })
}
