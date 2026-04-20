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

function normalizePositiveInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

function buildDefaultSandboxLimits(): SandboxLimits {
  return {
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxResultBytes: DEFAULT_MAX_RESULT_BYTES,
    maxLogBytes: DEFAULT_MAX_LOG_BYTES,
    maxCalls: DEFAULT_MAX_CALLS,
    maxResponseBytes: DEFAULT_MAX_RESPONSE_BYTES,
    maxHeapDeltaBytes: DEFAULT_MAX_HEAP_DELTA_BYTES,
  }
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

export function normalizeSandboxLimits(value: unknown): SandboxLimits | null {
  if (value === undefined) {
    return buildDefaultSandboxLimits()
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  const raw = value as Record<string, unknown>

  return {
    timeoutMs: normalizePositiveInt(raw.timeoutMs, DEFAULT_TIMEOUT_MS),
    maxResultBytes: normalizePositiveInt(raw.maxResultBytes, DEFAULT_MAX_RESULT_BYTES),
    maxLogBytes: normalizePositiveInt(raw.maxLogBytes, DEFAULT_MAX_LOG_BYTES),
    maxCalls: normalizePositiveInt(raw.maxCalls, DEFAULT_MAX_CALLS),
    maxResponseBytes: normalizePositiveInt(raw.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES),
    maxHeapDeltaBytes: normalizePositiveInt(raw.maxHeapDeltaBytes, DEFAULT_MAX_HEAP_DELTA_BYTES),
  }
}
