import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SandboxLimits } from '../src/codemode/sandbox/types.js'
import {
  loadSubprocessRunner,
  subprocessTestWorkerPath,
  useSubprocessTestWorker,
} from './helpers/subprocess-worker.js'

function createLimits(overrides: Partial<SandboxLimits> = {}): SandboxLimits {
  return {
    timeoutMs: 50,
    maxResultBytes: 8 * 1024,
    maxLogBytes: 2 * 1024,
    maxCalls: 5,
    maxResponseBytes: 16 * 1024,
    maxHeapDeltaBytes: 2 * 1024 * 1024,
    ...overrides,
  }
}

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sandbox subprocess runner integration', () => {
  it('times out when the worker is blocked waiting for a gateway call result', async () => {
    useSubprocessTestWorker('timeout-call')

    const { runExecuteInSubprocess } = await loadSubprocessRunner({ useRealChildProcess: true })

    await expect(
      runExecuteInSubprocess({
        code: 'await dokploy.project.one({ projectId: "p1" })',
        limits: createLimits({ timeoutMs: 25 }),
        onCall: async () =>
          new Promise(() => {
            // Intentionally unresolved to exercise the outer subprocess watchdog.
          }),
      }),
    ).rejects.toThrow(/Sandbox (?:subprocess|execution) timed out after 25ms\./)
  })

  it('returns an explicit IPC error when the worker cannot serialize a procedure call', async () => {
    useSubprocessTestWorker('unserializable-call')

    const { runExecuteInSubprocess } = await loadSubprocessRunner({ useRealChildProcess: true })
    const onCall = vi.fn(async () => ({ ok: true }))

    await expect(
      runExecuteInSubprocess({
        code: `
          const input = { projectId: 'p1', bad: 1n }
          return await dokploy.call('project.one', input)
        `,
        limits: createLimits(),
        onCall,
      }),
    ).rejects.toThrow(/Sandbox worker failed to send procedure call:/)

    expect(onCall).not.toHaveBeenCalled()
  })

  it('fails fast when the reusable test worker mode is unsupported', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_WORKER_PATH', subprocessTestWorkerPath)
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE', 'unsupported')

    const { runExecuteInSubprocess } = await loadSubprocessRunner({ useRealChildProcess: true })

    await expect(
      runExecuteInSubprocess({
        code: 'await dokploy.project.one({ projectId: "p1" })',
        limits: createLimits(),
        onCall: async () => ({ ok: true }),
      }),
    ).rejects.toThrow('Unsupported sandbox test worker mode: unsupported.')
  })
})
