import { EventEmitter } from 'node:events'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SandboxLimits } from '../src/codemode/sandbox/types.js'
import { loadSubprocessRunner } from './helpers/subprocess-worker.js'

class FakeWorker extends EventEmitter {
  connected = true
  disconnect = vi.fn(() => {
    this.connected = false
  })
  kill = vi.fn()
  send = vi.fn((_message: unknown) => true)
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

function createLimits(overrides: Partial<SandboxLimits> = {}): SandboxLimits {
  return {
    timeoutMs: 25,
    maxResultBytes: 1024,
    maxLogBytes: 1024,
    maxCalls: 5,
    maxResponseBytes: 1024,
    maxHeapDeltaBytes: 1024,
    ...overrides,
  }
}

function queueWorker() {
  const worker = new FakeWorker()
  queuedWorkers.push(worker)
  return worker
}

afterEach(() => {
  queuedWorkers.length = 0
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('sandbox subprocess runner', () => {
  it('rejects when the worker sends an invalid search payload', async () => {
    const worker = queueWorker()
    const { runSearchInSubprocess } = await loadSubprocessRunner()

    const promise = runSearchInSubprocess({
      code: 'catalog.endpoints.length',
      limits: createLimits(),
    })

    worker.emit('message', { type: 'unexpected' })

    await expect(promise).rejects.toThrow('Sandbox worker sent an invalid message.')
    expect(worker.disconnect).toHaveBeenCalledOnce()
    expect(worker.kill).toHaveBeenCalledOnce()
  })

  it('rejects when the worker exits before completing', async () => {
    const worker = queueWorker()
    const { runSearchInSubprocess } = await loadSubprocessRunner()

    const promise = runSearchInSubprocess({
      code: 'catalog.endpoints.length',
      limits: createLimits(),
    })

    worker.emit('exit', 17, null)

    await expect(promise).rejects.toThrow('Sandbox worker exited with code 17.')
  })

  it('falls back to an explicit IPC serialization error for execute call results', async () => {
    const worker = queueWorker()
    const sent: unknown[] = []

    worker.send = vi.fn((message: unknown) => {
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
          worker.emit('message', {
            type: 'done',
            ok: false,
            error:
              typeof message.error === 'string'
                ? message.error
                : 'Sandbox call result could not be serialized for IPC.',
          })
        })
      }

      return true
    })

    const { runExecuteInSubprocess } = await loadSubprocessRunner()
    const promise = runExecuteInSubprocess({
      code: 'await dokploy.project.one({ projectId: "p1" })',
      limits: createLimits(),
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

  it('rejects when the subprocess watchdog expires', async () => {
    vi.useFakeTimers()

    queueWorker()
    const { runExecuteInSubprocess } = await loadSubprocessRunner()
    const promise = runExecuteInSubprocess({
      code: 'await dokploy.project.one({ projectId: "p1" })',
      limits: createLimits({ timeoutMs: 10 }),
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
