import type { SandboxLimits } from './types.js'

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RESULT_BYTES = 128 * 1024
const DEFAULT_MAX_LOG_BYTES = 8 * 1024
const DEFAULT_MAX_CALLS = 25
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const DEFAULT_MAX_HEAP_DELTA_BYTES = 16 * 1024 * 1024

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function resolveSandboxLimits(): SandboxLimits {
  return {
    timeoutMs: parsePositiveInt(process.env.DOKPLOY_MCP_SANDBOX_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxResultBytes: parsePositiveInt(
      process.env.DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES,
      DEFAULT_MAX_RESULT_BYTES,
    ),
    maxLogBytes: parsePositiveInt(
      process.env.DOKPLOY_MCP_SANDBOX_MAX_LOG_BYTES,
      DEFAULT_MAX_LOG_BYTES,
    ),
    maxCalls: parsePositiveInt(process.env.DOKPLOY_MCP_SANDBOX_MAX_CALLS, DEFAULT_MAX_CALLS),
    maxResponseBytes: parsePositiveInt(
      process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES,
      DEFAULT_MAX_RESPONSE_BYTES,
    ),
    maxHeapDeltaBytes: parsePositiveInt(
      process.env.DOKPLOY_MCP_SANDBOX_MAX_HEAP_DELTA_BYTES,
      DEFAULT_MAX_HEAP_DELTA_BYTES,
    ),
  }
}
