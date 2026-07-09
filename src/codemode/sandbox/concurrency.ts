export interface SandboxSlot {
  release: () => void
}

interface SlotWaiter {
  resolve: (slot: SandboxSlot) => void
  reject: (error: Error) => void
  signal?: AbortSignal
  cleanup?: () => void
}

const maxConcurrentEnvName = 'DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT'
const DEFAULT_MAX_CONCURRENT = 4

let activeSlots = 0
const waitQueue: SlotWaiter[] = []

export async function acquireSandboxSlot(signal?: AbortSignal): Promise<SandboxSlot> {
  if (signal?.aborted) {
    throw createAbortError()
  }

  const capacity = resolveMaxConcurrent()
  if (activeSlots < capacity) {
    activeSlots += 1
    return createSlot()
  }

  if (waitQueue.length >= capacity * 4) {
    throw new Error(`Sandbox is at capacity (${capacity} running, ${waitQueue.length} queued).`)
  }

  return new Promise<SandboxSlot>((resolve, reject) => {
    const waiter: SlotWaiter = { resolve, reject, signal }
    waiter.cleanup = registerAbortHandler(waiter)
    waitQueue.push(waiter)
  })
}

function resolveMaxConcurrent() {
  const parsed = Number.parseInt(process.env[maxConcurrentEnvName] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_CONCURRENT
}

function createSlot(): SandboxSlot {
  let released = false

  return {
    release: () => {
      if (released) {
        return
      }

      released = true
      releaseSlot()
    },
  }
}

function releaseSlot() {
  const waiter = waitQueue.shift()
  if (!waiter) {
    activeSlots = Math.max(0, activeSlots - 1)
    return
  }

  waiter.cleanup?.()
  waiter.resolve(createSlot())
}

function registerAbortHandler(waiter: SlotWaiter) {
  if (!waiter.signal) {
    return undefined
  }

  const onAbort = () => {
    removeWaiter(waiter)
    waiter.reject(createAbortError())
  }
  waiter.signal.addEventListener('abort', onAbort, { once: true })

  return () => {
    waiter.signal?.removeEventListener('abort', onAbort)
  }
}

function removeWaiter(waiter: SlotWaiter) {
  const index = waitQueue.indexOf(waiter)
  if (index >= 0) {
    waitQueue.splice(index, 1)
  }
  waiter.cleanup?.()
}

function createAbortError() {
  const error = new Error('Sandbox execution was aborted.')
  error.name = 'AbortError'
  return error
}
