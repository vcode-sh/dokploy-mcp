import { fork } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveSandboxLimits } from './limits.js'
import type { SandboxExecutionResult, SandboxLimits } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workerPath = resolve(__dirname, '../../../dist/codemode/sandbox/worker-entry.js')

interface WorkerDoneMessage {
  type: 'done'
  ok: boolean
  result?: unknown
  logs?: string[]
  error?: string
}

function createWorker() {
  return fork(workerPath, {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: {},
    execArgv: [],
  })
}

function resolveLimits(limits?: SandboxLimits) {
  return limits ?? resolveSandboxLimits()
}

function handleWorkerExit(rejectPromise: (reason?: unknown) => void, code: number | null) {
  if (code && code !== 0) {
    rejectPromise(new Error(`Sandbox worker exited with code ${code}`))
  }
}

function finishWorker(
  worker: ReturnType<typeof createWorker>,
  payload: WorkerDoneMessage,
  resolvePromise: (value: SandboxExecutionResult) => void,
  rejectPromise: (reason?: unknown) => void,
) {
  worker.disconnect()
  worker.kill()

  if (payload.ok) {
    resolvePromise({
      result: payload.result,
      logs: payload.logs ?? [],
    })
  } else {
    rejectPromise(new Error(payload.error ?? 'Unknown sandbox subprocess error'))
  }
}

export async function runSearchInSubprocess(options: {
  code: string
  limits?: SandboxLimits
}): Promise<SandboxExecutionResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const worker = createWorker()

    worker.on('message', (message: unknown) => {
      const payload = message as WorkerDoneMessage
      if (payload.type !== 'done') {
        return
      }
      finishWorker(worker, payload, resolvePromise, rejectPromise)
    })

    worker.on('error', rejectPromise)
    worker.on('exit', (code) => handleWorkerExit(rejectPromise, code))

    worker.send({
      type: 'run',
      mode: 'search',
      code: options.code,
      limits: resolveLimits(options.limits),
    })
  })
}

export async function runExecuteInSubprocess(options: {
  code: string
  limits?: SandboxLimits
  onCall: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
}): Promise<SandboxExecutionResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const worker = createWorker()

    worker.on('message', async (message: unknown) => {
      const payload = message as Record<string, unknown>

      if (payload.type === 'call') {
        const requestId = payload.requestId
        try {
          const data = await options.onCall(
            String(payload.procedure),
            (payload.input as Record<string, unknown> | undefined) ?? {},
          )
          worker.send({ type: 'callResult', requestId, ok: true, data })
        } catch (error) {
          worker.send({
            type: 'callResult',
            requestId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
        return
      }

      const done = payload as unknown as WorkerDoneMessage
      if (done.type !== 'done') {
        return
      }
      finishWorker(worker, done, resolvePromise, rejectPromise)
    })

    worker.on('error', rejectPromise)
    worker.on('exit', (code) => handleWorkerExit(rejectPromise, code))

    worker.send({
      type: 'run',
      mode: 'execute',
      code: options.code,
      limits: resolveLimits(options.limits),
    })
  })
}
