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
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('sandbox subprocess runner', () => {
  describe('worker launch isolation', () => {
    it('launches workers with an empty environment by default', async () => {
      vi.stubEnv('DOKPLOY_API_KEY', 'test-placeholder-not-a-real-key')
      const { worker, promise } = await startSearchRun()

      const [, options] = forkMock.mock.calls[0]

      expect(options).toEqual(
        expect.objectContaining({
          env: {},
          execArgv: ['--max-old-space-size=256'],
          stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        }),
      )
      expect(options?.env).not.toHaveProperty('DOKPLOY_API_KEY')
      expect(options?.execArgv).not.toContain('--inspect')
      expect(options?.execArgv).not.toEqual(process.execArgv)

      worker.emit('message', {
        type: 'done',
        ok: true,
        result: 1,
        logs: [],
      })
      await expect(promise).resolves.toEqual({ result: 1, logs: [] })
    })

    it('passes only the explicit test worker mode through the environment', async () => {
      vi.stubEnv('DOKPLOY_API_KEY', 'test-placeholder-not-a-real-key')
      vi.stubEnv('DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE', 'echo')
      const { worker, promise } = await startSearchRun()

      const [, options] = forkMock.mock.calls[0]

      expect(options).toEqual(
        expect.objectContaining({
          env: {
            DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE: 'echo',
          },
        }),
      )
      expect(options?.env).not.toHaveProperty('DOKPLOY_API_KEY')

      worker.emit('message', {
        type: 'done',
        ok: true,
        result: 1,
        logs: [],
      })
      await expect(promise).resolves.toEqual({ result: 1, logs: [] })
    })

    it('uses a configured worker memory ceiling when launching workers', async () => {
      vi.stubEnv('DOKPLOY_MCP_SANDBOX_WORKER_MEMORY_MB', '64')
      const { worker, promise } = await startSearchRun()

      const [, options] = forkMock.mock.calls[0]

      expect(options).toEqual(
        expect.objectContaining({
          execArgv: ['--max-old-space-size=64'],
        }),
      )

      worker.emit('message', {
        type: 'done',
        ok: true,
        result: 1,
        logs: [],
      })
      await expect(promise).resolves.toEqual({ result: 1, logs: [] })
    })

    it('falls back to the default worker memory ceiling for invalid values', async () => {
      vi.stubEnv('DOKPLOY_MCP_SANDBOX_WORKER_MEMORY_MB', '0')
      const { worker, promise } = await startSearchRun()

      const [, options] = forkMock.mock.calls[0]

      expect(options).toEqual(
        expect.objectContaining({
          execArgv: ['--max-old-space-size=256'],
        }),
      )

      worker.emit('message', {
        type: 'done',
        ok: true,
        result: 1,
        logs: [],
      })
      await expect(promise).resolves.toEqual({ result: 1, logs: [] })
    })
  })

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

  it('rejects when the worker sends an invalid done payload', async () => {
    const { worker, promise } = await startSearchRun()

    worker.emit('message', {
      type: 'done',
      ok: true,
      result: null,
      logs: [1],
    })

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

  it('serializes structured gateway-style errors into readable execute call results', async () => {
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
                : 'memoryLimit must be a string containing bytes.',
          })
        })
        return true
      }

      callback?.(null)
      return true
    })

    const { promise } = await startExecuteRun({
      worker,
      onCall: async () => {
        throw {
          type: 'validation_error',
          procedure: 'application.update',
          message: 'memoryLimit must be a string containing bytes. Example: 256MB -> "268435456".',
        }
      },
    })

    worker.emit('message', {
      type: 'call',
      requestId: 11,
      procedure: 'application.update',
      input: { applicationId: 'app-1', memoryLimit: '256M' },
    })

    await expect(promise).rejects.toThrow('memoryLimit must be a string containing bytes')
    expect(sent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'callResult',
          requestId: 11,
          ok: false,
          error: 'memoryLimit must be a string containing bytes. Example: 256MB -> "268435456".',
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

  it('serializes subprocess starts through the sandbox concurrency cap', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT', '1')
    const { runExecuteInSubprocess } = await loadSubprocessRunner()
    const firstWorker = queueWorker()
    const firstPromise = runExecuteInSubprocess({
      code: defaultExecuteCode,
      limits: createSubprocessLimits(),
      onCall: async () => ({ ok: true }),
    })
    await vi.waitFor(() => {
      expect(forkMock).toHaveBeenCalledTimes(1)
    })

    const secondWorker = queueWorker()
    const secondPromise = runExecuteInSubprocess({
      code: defaultExecuteCode,
      limits: createSubprocessLimits(),
      onCall: async () => ({ ok: true }),
    })

    expect(forkMock).toHaveBeenCalledTimes(1)

    firstWorker.emit('message', {
      type: 'done',
      ok: true,
      result: 'first',
      logs: [],
    })

    await expect(firstPromise).resolves.toEqual({ result: 'first', logs: [] })
    await vi.waitFor(() => {
      expect(forkMock).toHaveBeenCalledTimes(2)
    })

    secondWorker.emit('message', {
      type: 'done',
      ok: true,
      result: 'second',
      logs: [],
    })

    await expect(secondPromise).resolves.toEqual({ result: 'second', logs: [] })
  })

  it('keeps fork-per-call behavior when worker reuse is not enabled', async () => {
    const { runSearchInSubprocess } = await loadSubprocessRunner()
    const firstWorker = queueWorker()
    const firstPromise = runSearchInSubprocess({
      code: defaultSearchCode,
      limits: createSubprocessLimits(),
    })
    await vi.waitFor(() => {
      expect(firstWorker.send).toHaveBeenCalledOnce()
    })

    firstWorker.emit('message', {
      type: 'done',
      ok: true,
      result: 'first',
      logs: [],
    })
    await expect(firstPromise).resolves.toEqual({ result: 'first', logs: [] })

    const secondWorker = queueWorker()
    const secondPromise = runSearchInSubprocess({
      code: defaultSearchCode,
      limits: createSubprocessLimits(),
    })
    await vi.waitFor(() => {
      expect(secondWorker.send).toHaveBeenCalledOnce()
    })

    secondWorker.emit('message', {
      type: 'done',
      ok: true,
      result: 'second',
      logs: [],
    })

    await expect(secondPromise).resolves.toEqual({ result: 'second', logs: [] })
    expect(forkMock).toHaveBeenCalledTimes(2)
    expect(firstWorker.disconnect).toHaveBeenCalledOnce()
    expect(firstWorker.kill).toHaveBeenCalledOnce()
  })

  it('reuses one successful worker for sequential runs when explicitly enabled', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_WORKER_REUSE', '1')
    const { runSearchInSubprocess } = await loadSubprocessRunner()
    const worker = queueWorker()
    const firstPromise = runSearchInSubprocess({
      code: defaultSearchCode,
      limits: createSubprocessLimits(),
    })
    await vi.waitFor(() => {
      expect(worker.send).toHaveBeenCalledOnce()
    })

    worker.emit('message', {
      type: 'done',
      ok: true,
      result: 'first',
      logs: [],
    })
    await expect(firstPromise).resolves.toEqual({ result: 'first', logs: [] })

    const secondPromise = runSearchInSubprocess({
      code: defaultSearchCode,
      limits: createSubprocessLimits(),
    })
    await vi.waitFor(() => {
      expect(worker.send).toHaveBeenCalledTimes(2)
    })

    worker.emit('message', {
      type: 'done',
      ok: true,
      result: 'second',
      logs: [],
    })

    await expect(secondPromise).resolves.toEqual({ result: 'second', logs: [] })
    expect(forkMock).toHaveBeenCalledOnce()
    expect(worker.disconnect).not.toHaveBeenCalled()
    expect(worker.kill).not.toHaveBeenCalled()
    expect(worker.send).toHaveBeenCalledTimes(2)
  })

  it('discards a reusable worker after an error run', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_WORKER_REUSE', '1')
    const { runSearchInSubprocess } = await loadSubprocessRunner()
    const failedWorker = queueWorker()
    const failedPromise = runSearchInSubprocess({
      code: defaultSearchCode,
      limits: createSubprocessLimits(),
    })
    await vi.waitFor(() => {
      expect(failedWorker.send).toHaveBeenCalledOnce()
    })

    failedWorker.emit('message', { type: 'unexpected' })
    await expect(failedPromise).rejects.toThrow('Sandbox worker sent an invalid message.')

    const nextWorker = queueWorker()
    const nextPromise = runSearchInSubprocess({
      code: defaultSearchCode,
      limits: createSubprocessLimits(),
    })
    await vi.waitFor(() => {
      expect(nextWorker.send).toHaveBeenCalledOnce()
    })

    nextWorker.emit('message', {
      type: 'done',
      ok: true,
      result: 'next',
      logs: [],
    })

    await expect(nextPromise).resolves.toEqual({ result: 'next', logs: [] })
    expect(forkMock).toHaveBeenCalledTimes(2)
    expect(failedWorker.disconnect).toHaveBeenCalledOnce()
    expect(failedWorker.kill).toHaveBeenCalledOnce()
  })
})
