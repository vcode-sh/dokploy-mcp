import { createGeneratedDokployRuntime } from '../../generated/dokploy-sdk.js'
import type { GatewayCallResult } from '../gateway/api-gateway.js'

type CallExecutor = (
  procedure: string,
  input?: Record<string, unknown>,
) => Promise<GatewayCallResult>

export function buildHelpers() {
  return {
    sleep(ms: number) {
      const clamped = Math.min(Math.max(0, ms), 15_000)
      return new Promise<void>((resolve) => setTimeout(resolve, clamped))
    },
    assert(condition: unknown, message = 'Assertion failed') {
      if (!condition) {
        throw new Error(message)
      }
    },
    pick<T extends Record<string, unknown>, K extends keyof T>(value: T, keys: K[]) {
      return Object.fromEntries(keys.map((key) => [key, value[key]])) as Pick<T, K>
    },
    limit<T>(items: T[], count: number) {
      return items.slice(0, count)
    },
    selectOne<T>(items: T[], predicate?: (item: T) => boolean) {
      if (!predicate) return items[0] ?? null
      return items.find(predicate) ?? null
    },
    async paginateUntil<T>(
      fetchPage: (offset: number) => Promise<{ items: T[]; total?: number }>,
      predicate: (item: T) => boolean,
      pageSize = 20,
    ) {
      let offset = 0
      while (true) {
        const page = await fetchPage(offset)
        const found = page.items.find(predicate)
        if (found) return found
        if (page.items.length < pageSize) return null
        offset += pageSize
      }
    },
  }
}

export function createCallTracker(executor: CallExecutor, maxCalls: number) {
  const traces: GatewayCallResult['trace'][] = []
  let callCount = 0

  async function call(procedure: string, input: Record<string, unknown> = {}) {
    callCount += 1
    if (callCount > maxCalls) {
      throw new Error(`Code Mode execute exceeded ${maxCalls} API calls.`)
    }

    const result = await executor(procedure, input)
    traces.push(result.trace)
    return result.data
  }

  return {
    call,
    getCalls() {
      return traces
    },
  }
}

export function createExecuteContext(executor: CallExecutor, maxCalls: number) {
  const tracker = createCallTracker(executor, maxCalls)

  return {
    dokploy: createGeneratedDokployRuntime(tracker.call),
    helpers: buildHelpers(),
    getCalls: tracker.getCalls,
  }
}
