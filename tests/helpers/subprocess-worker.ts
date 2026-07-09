import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { vi } from 'vitest'

import type { SandboxLimits } from '../../src/codemode/sandbox/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const subprocessTestWorkerPath = resolve(
  __dirname,
  '../fixtures/subprocess-workers/test-worker.js',
)

const subprocessWorkerPathEnvName = 'DOKPLOY_MCP_SANDBOX_WORKER_PATH'
const subprocessWorkerModeEnvName = 'DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE'
const unsupportedSubprocessTestWorkerMode = 'unsupported'

export const subprocessTestWorkerModes = [
  'timeout-call',
  'unserializable-call',
  'invalid-done',
  'disconnect-after-call',
  'disconnect-immediately',
  'env-report',
] as const
export type SubprocessTestWorkerMode = (typeof subprocessTestWorkerModes)[number]

const defaultSubprocessLimits: SandboxLimits = {
  timeoutMs: 25,
  maxResultBytes: 1024,
  maxLogBytes: 1024,
  maxCalls: 5,
  maxResponseBytes: 1024,
  maxHeapDeltaBytes: 1024,
}

const defaultSubprocessIntegrationLimits: SandboxLimits = {
  timeoutMs: 500,
  maxResultBytes: 8 * 1024,
  maxLogBytes: 2 * 1024,
  maxCalls: 5,
  maxResponseBytes: 16 * 1024,
  maxHeapDeltaBytes: 2 * 1024 * 1024,
}

function mergeSubprocessLimits(
  base: SandboxLimits,
  overrides: Partial<SandboxLimits> = {},
): SandboxLimits {
  return {
    ...base,
    ...overrides,
  }
}

export function createSubprocessLimits(overrides: Partial<SandboxLimits> = {}): SandboxLimits {
  return mergeSubprocessLimits(defaultSubprocessLimits, overrides)
}

export function createSubprocessIntegrationLimits(
  overrides: Partial<SandboxLimits> = {},
): SandboxLimits {
  return mergeSubprocessLimits(defaultSubprocessIntegrationLimits, overrides)
}

export async function loadSubprocessRunner(options?: { useRealChildProcess?: boolean }) {
  if (options?.useRealChildProcess) {
    vi.doUnmock('node:child_process')
    vi.doUnmock('child_process')
  }

  vi.resetModules()

  return import('../../src/codemode/sandbox/subprocess-runner.js')
}

export async function loadRealSubprocessRunner() {
  return loadSubprocessRunner({ useRealChildProcess: true })
}

export async function loadRealSubprocessRunnerWithTestWorker(mode: SubprocessTestWorkerMode) {
  const runner = await loadRealSubprocessRunner()
  const workerOptions = {
    workerPath: subprocessTestWorkerPath,
    workerEnv: {
      [subprocessWorkerModeEnvName]: mode,
    },
  }

  return {
    ...runner,
    runSearchInSubprocess: (options: Parameters<typeof runner.runSearchInSubprocess>[0]) =>
      runner.runSearchInSubprocess({ ...options, ...workerOptions }),
    runExecuteInSubprocess: (options: Parameters<typeof runner.runExecuteInSubprocess>[0]) =>
      runner.runExecuteInSubprocess({ ...options, ...workerOptions }),
  }
}

export async function loadRealSubprocessRunnerWithInvalidTestWorker(
  mode = unsupportedSubprocessTestWorkerMode,
) {
  const runner = await loadRealSubprocessRunner()
  const workerOptions = {
    workerPath: subprocessTestWorkerPath,
    workerEnv: {
      [subprocessWorkerModeEnvName]: mode,
    },
  }

  return {
    ...runner,
    runSearchInSubprocess: (options: Parameters<typeof runner.runSearchInSubprocess>[0]) =>
      runner.runSearchInSubprocess({ ...options, ...workerOptions }),
    runExecuteInSubprocess: (options: Parameters<typeof runner.runExecuteInSubprocess>[0]) =>
      runner.runExecuteInSubprocess({ ...options, ...workerOptions }),
  }
}

export function useSubprocessTestWorker(mode: SubprocessTestWorkerMode) {
  useConfiguredSubprocessTestWorker(mode)
}

export function useInvalidSubprocessTestWorker(mode = unsupportedSubprocessTestWorkerMode) {
  useConfiguredSubprocessTestWorker(mode)
}

function useConfiguredSubprocessTestWorker(mode: string) {
  vi.stubEnv(subprocessWorkerPathEnvName, subprocessTestWorkerPath)
  vi.stubEnv(subprocessWorkerModeEnvName, mode)
}
