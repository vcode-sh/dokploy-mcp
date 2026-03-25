import type { GatewayCallResult } from '../gateway/api-gateway.js'
import { invokeProcedure } from '../gateway/api-gateway.js'
import { resolveSandboxLimits } from './limits.js'

interface SandboxHostOptions {
  maxCalls?: number
  executor?: (procedure: string, input?: Record<string, unknown>) => Promise<GatewayCallResult>
}

export interface SandboxHost {
  call(procedure: string, input?: Record<string, unknown>): Promise<GatewayCallResult>
  getCalls(): GatewayCallResult['trace'][]
}

export function createSandboxHost(options: SandboxHostOptions = {}): SandboxHost {
  const limits = resolveSandboxLimits()
  const maxCalls = options.maxCalls ?? limits.maxCalls
  const executor = options.executor ?? invokeProcedure
  const traces: GatewayCallResult['trace'][] = []
  let callCount = 0
  let responseBytes = 0

  return {
    async call(procedure: string, input: Record<string, unknown> = {}) {
      callCount += 1
      if (callCount > maxCalls) {
        throw new Error(`Code Mode execute exceeded ${maxCalls} API calls.`)
      }

      const result = await executor(procedure, input)
      responseBytes += Buffer.byteLength(JSON.stringify(result.data), 'utf8')
      if (responseBytes > limits.maxResponseBytes) {
        throw new Error(
          `Code Mode execute exceeded ${limits.maxResponseBytes} bytes of Dokploy responses.`,
        )
      }
      traces.push(result.trace)
      return result
    },
    getCalls() {
      return traces
    },
  }
}
