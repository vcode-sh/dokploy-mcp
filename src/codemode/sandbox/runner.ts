import { createContext, Script } from 'node:vm'

import { resolveSandboxLimits } from './limits.js'
import { serializeSandboxValue } from './serialize.js'
import type { SandboxExecutionResult, SandboxLimits } from './types.js'

interface RunSandboxedFunctionOptions<TContext extends Record<string, unknown>> {
  code: string
  context: TContext
  limits?: SandboxLimits
}

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item)
    }
    return Object.freeze(value)
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      deepFreeze(item)
    }
    return Object.freeze(value)
  }

  return value
}

export async function runSandboxedFunction<TContext extends Record<string, unknown>>({
  code,
  context,
  limits: providedLimits,
}: RunSandboxedFunctionOptions<TContext>): Promise<SandboxExecutionResult> {
  const limits = providedLimits ?? resolveSandboxLimits()
  const logs: string[] = []
  let loggedBytes = 0

  const frozenContext = deepFreeze(context)

  const sandbox = createContext(
    {
      __context: frozenContext,
      console: {
        log: (...args: unknown[]) => {
          const line = args
            .map((arg) => {
              try {
                return typeof arg === 'string' ? arg : JSON.stringify(arg)
              } catch {
                return String(arg)
              }
            })
            .join(' ')

          loggedBytes += Buffer.byteLength(line, 'utf8')
          if (loggedBytes > limits.maxLogBytes) {
            throw new Error(`Sandbox logs exceeded ${limits.maxLogBytes} bytes.`)
          }

          logs.push(line)
        },
      },
      process: undefined,
      fetch: undefined,
      require: undefined,
      module: undefined,
      exports: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      clearTimeout: undefined,
      clearInterval: undefined,
      queueMicrotask: undefined,
      Buffer: undefined,
      Function: undefined,
      eval: undefined,
      WebAssembly: undefined,
      SharedArrayBuffer: undefined,
    },
    {
      codeGeneration: {
        strings: false,
        wasm: false,
      },
    },
  )

  const script = new Script(
    `
      (async () => {
        const __fn = (${code})
        if (typeof __fn !== 'function') {
          throw new Error('Sandbox code must evaluate to a function.')
        }
        if (__fn.constructor?.name !== 'AsyncFunction') {
          throw new Error('Sandbox code must evaluate to an async function.')
        }
        return await __fn(__context)
      })()
    `,
    {
      filename: 'codemode-sandbox.js',
    },
  )

  let timeoutId: NodeJS.Timeout | undefined
  let settled = false

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (settled) {
        return
      }
      settled = true
      reject(new Error(`Sandbox execution timed out after ${limits.timeoutMs}ms.`))
    }, limits.timeoutMs)
    timeoutId.unref?.()
  })
  void timeoutPromise.catch(() => {
    // Intentionally swallowed because Promise.race may resolve through the VM timeout path first.
  })

  const executionPromise = Promise.resolve(
    script.runInContext(sandbox, {
      timeout: limits.timeoutMs,
    }),
  )

  const result = await Promise.race([executionPromise, timeoutPromise]).finally(() => {
    settled = true
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })

  const serializedResult = serializeSandboxValue(result, limits.maxResultBytes)
  const heapEstimateBytes = Buffer.byteLength(JSON.stringify(serializedResult), 'utf8')
  if (heapEstimateBytes > limits.maxHeapDeltaBytes) {
    throw new Error(`Sandbox heap delta exceeded ${limits.maxHeapDeltaBytes} bytes.`)
  }

  return {
    result: serializedResult,
    logs,
  }
}
