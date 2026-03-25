export interface GatewayTraceEntry {
  procedure: string
  method: 'GET' | 'POST'
  startedAt: number
  finishedAt: number
  durationMs: number
}

export function startTrace(procedure: string, method: 'GET' | 'POST') {
  return { procedure, method, startedAt: Date.now() }
}

export function finishTrace(trace: ReturnType<typeof startTrace>): GatewayTraceEntry {
  const finishedAt = Date.now()
  return {
    ...trace,
    finishedAt,
    durationMs: finishedAt - trace.startedAt,
  }
}
