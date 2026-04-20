import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createSubprocessIntegrationLimits,
  loadRealSubprocessRunnerWithInvalidTestWorker,
  loadRealSubprocessRunnerWithTestWorker,
  type SubprocessTestWorkerMode,
} from './helpers/subprocess-worker.js'

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const defaultExecuteCode = 'await dokploy.project.one({ projectId: "p1" })'

async function runRealExecuteWithTestWorker(options: {
  mode: SubprocessTestWorkerMode
  code?: string
  limits?: Parameters<typeof createSubprocessIntegrationLimits>[0]
  onCall: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
}) {
  const { runExecuteInSubprocess } = await loadRealSubprocessRunnerWithTestWorker(options.mode)

  return runExecuteInSubprocess({
    code: options.code ?? defaultExecuteCode,
    limits: createSubprocessIntegrationLimits(options.limits),
    onCall: options.onCall,
  })
}

async function runRealSearchWithTestWorker(options: {
  mode: SubprocessTestWorkerMode
  code?: string
  limits?: Parameters<typeof createSubprocessIntegrationLimits>[0]
}) {
  const { runSearchInSubprocess } = await loadRealSubprocessRunnerWithTestWorker(options.mode)

  return runSearchInSubprocess({
    code: options.code ?? 'catalog.endpoints.length',
    limits: createSubprocessIntegrationLimits(options.limits),
  })
}

async function runRealExecuteWithInvalidTestWorker(options: {
  mode?: string
  code?: string
  limits?: Parameters<typeof createSubprocessIntegrationLimits>[0]
  onCall: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
}) {
  const { runExecuteInSubprocess } = await loadRealSubprocessRunnerWithInvalidTestWorker(
    options.mode,
  )

  return runExecuteInSubprocess({
    code: options.code ?? defaultExecuteCode,
    limits: createSubprocessIntegrationLimits(options.limits),
    onCall: options.onCall,
  })
}

describe('sandbox subprocess runner integration', () => {
  it('times out when the worker is blocked waiting for a gateway call result', async () => {
    await expect(
      runRealExecuteWithTestWorker({
        mode: 'timeout-call',
        limits: { timeoutMs: 25 },
        onCall: async () =>
          new Promise(() => {
            // Intentionally unresolved to exercise the outer subprocess watchdog.
          }),
      }),
    ).rejects.toThrow(/Sandbox (?:subprocess|execution) timed out after 25ms\./)
  })

  it('returns an explicit IPC error when the worker cannot serialize a procedure call', async () => {
    const onCall = vi.fn(async () => ({ ok: true }))

    await expect(
      runRealExecuteWithTestWorker({
        mode: 'unserializable-call',
        code: `
          const input = { projectId: 'p1', bad: 1n }
          return await dokploy.call('project.one', input)
        `,
        onCall,
      }),
    ).rejects.toThrow(/Sandbox worker failed to send procedure call:/)

    expect(onCall).not.toHaveBeenCalled()
  })

  it('rejects when the reusable test worker sends an invalid done payload', async () => {
    await expect(
      runRealSearchWithTestWorker({
        mode: 'invalid-done',
      }),
    ).rejects.toThrow('Sandbox worker sent an invalid message.')
  })

  it('fails fast when the worker disconnects before receiving a call result', async () => {
    const onCall = vi.fn(async () => ({ ok: true }))

    await expect(
      runRealExecuteWithTestWorker({
        mode: 'disconnect-after-call',
        onCall,
      }),
    ).rejects.toThrow(/Sandbox worker IPC channel failed while sending a procedure call result:/)

    expect(onCall).toHaveBeenCalledOnce()
  })

  it('fails fast when the reusable test worker mode is unsupported', async () => {
    await expect(
      runRealExecuteWithInvalidTestWorker({
        onCall: async () => ({ ok: true }),
      }),
    ).rejects.toThrow('Unsupported sandbox test worker mode: unsupported.')
  })

  it('fails fast when the worker disconnects before sending any result', async () => {
    await expect(
      runRealSearchWithTestWorker({
        mode: 'disconnect-immediately',
      }),
    ).rejects.toThrow('Sandbox worker IPC channel disconnected before completing.')
  })
})
