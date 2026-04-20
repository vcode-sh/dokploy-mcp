import { EventEmitter } from 'node:events'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SandboxLimits } from '../src/codemode/sandbox/types.js'

const { forkMock } = vi.hoisted(() => ({
  forkMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  fork: forkMock,
}))

class MockWorker extends EventEmitter {
  connected = true
  sentMessages: unknown[] = []
  disconnect = vi.fn(() => {
    this.connected = false
  })
  kill = vi.fn()

  send(message: unknown) {
    this.sentMessages.push(message)
    return true
  }
}

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

async function loadSubprocessRunner() {
  vi.resetModules()
  return import('../src/codemode/sandbox/subprocess-runner.js')
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('codemode subprocess runner', () => {
  it('rejects invalid worker messages for search mode', async () => {
    const worker = new MockWorker()
    forkMock.mockReturnValue(worker)

    const { runSearchInSubprocess } = await loadSubprocessRunner()
    const execution = runSearchInSubprocess({
      code: 'catalog.searchText("project")',
      limits: createLimits(),
    })

    worker.emit('message', { type: 'unexpected' })

    await expect(execution).rejects.toThrow('Sandbox worker sent an invalid message.')
    expect(worker.disconnect).toHaveBeenCalled()
    expect(worker.kill).toHaveBeenCalled()
  })

  it('rejects invalid done payloads for search mode', async () => {
    const worker = new MockWorker()
    forkMock.mockReturnValue(worker)

    const { runSearchInSubprocess } = await loadSubprocessRunner()
    const execution = runSearchInSubprocess({
      code: 'catalog.searchText("project")',
      limits: createLimits(),
    })

    worker.emit('message', {
      type: 'done',
      ok: true,
      result: null,
      logs: [1],
    })

    await expect(execution).rejects.toThrow('Sandbox worker sent an invalid message.')
    expect(worker.disconnect).toHaveBeenCalled()
    expect(worker.kill).toHaveBeenCalled()
  })

  it('rejects when the worker exits before completing', async () => {
    const worker = new MockWorker()
    forkMock.mockReturnValue(worker)

    const { runSearchInSubprocess } = await loadSubprocessRunner()
    const execution = runSearchInSubprocess({
      code: 'catalog.searchText("project")',
      limits: createLimits(),
    })

    worker.emit('exit', 9, null)

    await expect(execution).rejects.toThrow('Sandbox worker exited with code 9.')
    expect(worker.kill).not.toHaveBeenCalled()
  })

  it('rejects when the subprocess does not finish before the timeout grace window', async () => {
    vi.useFakeTimers()

    const worker = new MockWorker()
    forkMock.mockReturnValue(worker)

    const { runSearchInSubprocess } = await loadSubprocessRunner()
    const execution = runSearchInSubprocess({
      code: 'catalog.searchText("project")',
      limits: createLimits({ timeoutMs: 10 }),
    })
    const rejection = expect(execution).rejects.toThrow('Sandbox subprocess timed out after 10ms.')

    await vi.advanceTimersByTimeAsync(110)

    await rejection
    expect(worker.disconnect).toHaveBeenCalled()
    expect(worker.kill).toHaveBeenCalled()
  })

  it('falls back to an explicit IPC serialization error when a call result cannot be sent', async () => {
    const worker = new MockWorker()
    forkMock.mockReturnValue(worker)

    const originalSend = worker.send.bind(worker)
    worker.send = vi.fn((message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'callResult' &&
        'ok' in message &&
        message.ok === true
      ) {
        throw new Error('IPC serialization failed')
      }

      return originalSend(message)
    })

    const { runExecuteInSubprocess } = await loadSubprocessRunner()
    const execution = runExecuteInSubprocess({
      code: 'await dokploy.project.one({ projectId: "project-1" })',
      limits: createLimits(),
      onCall: async () => ({ projectId: 'project-1', name: 'Example' }),
    })

    worker.emit('message', {
      type: 'call',
      requestId: 7,
      procedure: 'project.one',
      input: { projectId: 'project-1' },
    })
    await flushMicrotasks()

    expect(worker.send).toHaveBeenNthCalledWith(
      3,
      {
        type: 'callResult',
        requestId: 7,
        ok: false,
        error: 'Sandbox call result could not be serialized for IPC.',
      },
      expect.any(Function),
    )

    worker.emit('message', {
      type: 'done',
      ok: true,
      result: { ok: true },
      logs: [],
    })

    await expect(execution).resolves.toEqual({
      result: { ok: true },
      logs: [],
    })
  })
})
