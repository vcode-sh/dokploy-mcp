import { EventEmitter } from 'node:events'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SandboxLimits } from '../src/codemode/sandbox/types.js'
import { createSubprocessLimits, loadSubprocessRunner } from './helpers/subprocess-worker.js'

class FakeWorker extends EventEmitter {
  connected = true
  disconnect = vi.fn(() => {
    this.connected = false
  })
  kill = vi.fn()
  send = vi.fn((_message: unknown, callback?: (error: Error | null) => void) => {
    callback?.(null)
    return true
  })
}

const queuedWorkers = vi.hoisted(() => [] as FakeWorker[])
const forkMock = vi.hoisted(() =>
  vi.fn(() => {
    const worker = queuedWorkers.shift()
    if (!worker) {
      throw new Error('No fake subprocess worker was queued for this test.')
    }
    return worker
  }),
)

vi.mock('node:child_process', () => ({
  fork: forkMock,
}))

function queueWorker() {
  const worker = new FakeWorker()
  queuedWorkers.push(worker)
  return worker
}

const defaultSearchCode = 'catalog.endpoints.length'
const defaultExecuteCode = 'await dokploy.project.one({ projectId: "p1" })'

async function startSearchRun(options?: { worker?: FakeWorker; limits?: Partial<SandboxLimits> }) {
  const worker = options?.worker ?? queueWorker()
  const { runSearchInSubprocess } = await loadSubprocessRunner()

  return {
    worker,
    promise: runSearchInSubprocess({
      code: defaultSearchCode,
      limits: createSubprocessLimits(options?.limits),
    }),
  }
}

async function startExecuteRun(options?: {
  worker?: FakeWorker
  code?: string
  limits?: Partial<SandboxLimits>
  onCall: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
}) {
  const worker = options?.worker ?? queueWorker()
  const { runExecuteInSubprocess } = await loadSubprocessRunner()

  return {
    worker,
    promise: runExecuteInSubprocess({
      code: options?.code ?? defaultExecuteCode,
      limits: createSubprocessLimits(options?.limits),
      onCall: options?.onCall ?? (async () => undefined),
    }),
  }
}

afterEach(() => {
  queuedWorkers.length = 0
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('sandbox subprocess runner', () => {
  it('rejects when the initial run payload cannot be sent over IPC', async () => {
    const worker = queueWorker()
    worker.send = vi.fn((_message: unknown, callback?: (error: Error | null) => void) => {
      queueMicrotask(() => {
        callback?.(new Error('IPC channel closed'))
      })
      return true
    })

    const { promise } = await startSearchRun({ worker })

    await expect(promise).rejects.toThrow('IPC channel closed')
    expect(worker.disconnect).toHaveBeenCalledOnce()
    expect(worker.kill).toHaveBeenCalledOnce()
  })

  it('rejects when the worker sends an invalid search payload', async () => {
    const { worker, promise } = await startSearchRun()

    worker.emit('message', { type: 'unexpected' })

    await expect(promise).rejects.toThrow('Sandbox worker sent an invalid message.')
    expect(worker.disconnect).toHaveBeenCalledOnce()
    expect(worker.kill).toHaveBeenCalledOnce()
  })

  it('rejects when the worker exits before completing', async () => {
    const { worker, promise } = await startSearchRun()

    worker.emit('exit', 17, null)

    await expect(promise).rejects.toThrow('Sandbox worker exited with code 17.')
  })

  it('rejects when the worker IPC channel disconnects before completing', async () => {
    const { worker, promise } = await startSearchRun()

    worker.emit('disconnect')

    await expect(promise).rejects.toThrow(
      'Sandbox worker IPC channel disconnected before completing.',
    )
    expect(worker.disconnect).toHaveBeenCalledOnce()
    expect(worker.kill).toHaveBeenCalledOnce()
  })

  it('falls back to an explicit IPC serialization error for execute call results', async () => {
    const worker = queueWorker()
    const sent: unknown[] = []

    worker.send = vi.fn((message: unknown, callback?: (error: Error | null) => void) => {
      sent.push(message)

      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'callResult' &&
        'ok' in message &&
        message.ok === true
      ) {
        throw new TypeError('Do not know how to serialize a BigInt')
      }

      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'callResult' &&
        'ok' in message &&
        message.ok === false
      ) {
        queueMicrotask(() => {
          callback?.(null)
          worker.emit('message', {
            type: 'done',
            ok: false,
            error:
              typeof message.error === 'string'
                ? message.error
                : 'Sandbox call result could not be serialized for IPC.',
          })
        })
        return true
      }

      callback?.(null)
      return true
    })

    const { promise } = await startExecuteRun({
      worker,
      onCall: async () => ({ value: 1n }),
    })

    worker.emit('message', {
      type: 'call',
      requestId: 1,
      procedure: 'project.one',
      input: { projectId: 'p1' },
    })

    await expect(promise).rejects.toThrow('Sandbox call result could not be serialized for IPC.')
    expect(sent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'callResult',
          requestId: 1,
          ok: false,
          error: 'Sandbox call result could not be serialized for IPC.',
        }),
      ]),
    )
  })

  it('falls back to an explicit IPC serialization error when a call result send fails asynchronously', async () => {
    const worker = queueWorker()
    const sent: unknown[] = []

    worker.send = vi.fn((message: unknown, callback?: (error: Error | null) => void) => {
      sent.push(message)

      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'callResult' &&
        'ok' in message &&
        message.ok === true
      ) {
        queueMicrotask(() => {
          callback?.(new TypeError('Do not know how to serialize a BigInt'))
        })
        return true
      }

      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'callResult' &&
        'ok' in message &&
        message.ok === false
      ) {
        queueMicrotask(() => {
          callback?.(null)
          worker.emit('message', {
            type: 'done',
            ok: false,
            error:
              typeof message.error === 'string'
                ? message.error
                : 'Sandbox call result could not be serialized for IPC.',
          })
        })
        return true
      }

      callback?.(null)
      return true
    })

    const { promise } = await startExecuteRun({
      worker,
      onCall: async () => ({ value: 1n }),
    })

    worker.emit('message', {
      type: 'call',
      requestId: 2,
      procedure: 'project.one',
      input: { projectId: 'p1' },
    })

    await expect(promise).rejects.toThrow('Sandbox call result could not be serialized for IPC.')
    expect(sent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'callResult',
          requestId: 2,
          ok: false,
          error: 'Sandbox call result could not be serialized for IPC.',
        }),
      ]),
    )
  })

  it('rejects when the worker disconnects before receiving a procedure call result', async () => {
    const worker = queueWorker()

    worker.send = vi.fn((message: unknown, callback?: (error: Error | null) => void) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'callResult' &&
        'ok' in message &&
        message.ok === true
      ) {
        queueMicrotask(() => {
          callback?.(new Error('Channel closed'))
        })
        return true
      }

      callback?.(null)
      return true
    })

    const { promise } = await startExecuteRun({
      worker,
      onCall: async () => ({ ok: true }),
    })

    worker.emit('message', {
      type: 'call',
      requestId: 3,
      procedure: 'project.one',
      input: { projectId: 'p1' },
    })

    await expect(promise).rejects.toThrow(
      'Sandbox worker IPC channel failed while sending a procedure call result: Channel closed',
    )
    expect(worker.disconnect).toHaveBeenCalledOnce()
    expect(worker.kill).toHaveBeenCalledOnce()
  })

  it('rejects when the execute worker sends an invalid procedure call payload', async () => {
    const { worker, promise } = await startExecuteRun({
      onCall: async () => ({ ok: true }),
    })

    worker.emit('message', {
      type: 'call',
      requestId: 'bad',
      procedure: 'project.one',
      input: { projectId: 'p1' },
    })

    await expect(promise).rejects.toThrow('Sandbox worker sent an invalid message.')
    expect(worker.disconnect).toHaveBeenCalledOnce()
    expect(worker.kill).toHaveBeenCalledOnce()
  })

  it('rejects when the subprocess watchdog expires', async () => {
    vi.useFakeTimers()

    const { promise } = await startExecuteRun({
      limits: { timeoutMs: 10 },
      onCall: async () =>
        new Promise(() => {
          // Intentionally unresolved to exercise the outer subprocess watchdog.
        }),
    })
    const expectation = expect(promise).rejects.toThrow('Sandbox subprocess timed out after 10ms.')

    await vi.advanceTimersByTimeAsync(110)

    await expectation
  })
})
