import { describe, expect, it, vi } from 'vitest'

import type { SandboxLimits } from '../src/codemode/sandbox/types.js'

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

async function loadRunner() {
  vi.resetModules()
  vi.doUnmock('node:child_process')
  return import('../src/codemode/sandbox/subprocess-runner.js')
}

describe('sandbox subprocess runner integration', () => {
  it('times out when the worker is blocked waiting for a gateway call result', async () => {
    const { runExecuteInSubprocess } = await loadRunner()

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
    const { runExecuteInSubprocess } = await loadRunner()
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
})
