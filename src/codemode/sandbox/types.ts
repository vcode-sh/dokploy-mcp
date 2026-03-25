export interface SandboxLimits {
  timeoutMs: number
  maxResultBytes: number
  maxLogBytes: number
  maxCalls: number
  maxResponseBytes: number
  maxHeapDeltaBytes: number
}

export interface SandboxExecutionResult {
  result: unknown
  logs: string[]
}
