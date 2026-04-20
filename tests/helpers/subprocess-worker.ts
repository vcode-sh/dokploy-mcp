import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { vi } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const subprocessTestWorkerPath = resolve(
  __dirname,
  '../fixtures/subprocess-workers/test-worker.js',
)

export type SubprocessTestWorkerMode = 'timeout-call' | 'unserializable-call'

export async function loadSubprocessRunner(options?: { useRealChildProcess?: boolean }) {
  vi.resetModules()

  if (options?.useRealChildProcess) {
    vi.doUnmock('node:child_process')
  }

  return import('../../src/codemode/sandbox/subprocess-runner.js')
}

export function useSubprocessTestWorker(mode: SubprocessTestWorkerMode) {
  vi.stubEnv('DOKPLOY_MCP_SANDBOX_WORKER_PATH', subprocessTestWorkerPath)
  vi.stubEnv('DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE', mode)
}
