import { createContext, Script } from 'node:vm'

import { normalizeCodemodeError } from '../error-message.js'
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

const ARROW_FN_RE = /^\s*async\s*\(/

/**
 * Auto-wraps raw code into an async function if the agent didn't provide one.
 * Accepts all these forms:
 *   1. async ({ dokploy }) => { ... }           -- arrow with destructuring (original)
 *   2. async (ctx) => { ... }                   -- arrow with param
 *   3. async () => dokploy.project.all()        -- arrow using globals
 *   4. dokploy.project.all()                    -- raw expression (auto-wrapped)
 *   5. const x = await dokploy.project.all()    -- raw statements (auto-wrapped)
 */
function wrapSandboxCode(code: string): string {
  const trimmed = code.trim()
  if (ARROW_FN_RE.test(trimmed)) {
    return trimmed
  }
  // Raw code -- wrap in an async function that receives context but ignores it
  // (context keys are already available as globals)
  const hasReturn = /\breturn\b/.test(trimmed)
  const body = hasReturn ? trimmed : `return (${trimmed})`
  return `async () => { ${body} }`
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

  const consoleProxy = {
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
  }

  const sandbox = createContext(
    {
      __context: frozenContext,
      // Expose context keys as top-level globals so agents can write
      // `dokploy.project.all()` or `catalog.searchText("x")` directly
      ...frozenContext,
      console: consoleProxy,
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

  const wrappedCode = wrapSandboxCode(code)

  const script = new Script(
    `
      (async () => {
        const __fn = (${wrappedCode})
        if (typeof __fn !== 'function') {
          throw new Error('Sandbox code must evaluate to a function.')
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

  let result: unknown

  try {
    result = await Promise.race([executionPromise, timeoutPromise])
  } catch (error) {
    throw normalizeCodemodeError(error, 'Sandbox execution failed.')
  } finally {
    settled = true
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

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
