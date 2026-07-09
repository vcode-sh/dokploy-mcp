import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadConcurrency() {
  vi.resetModules()
  return import('../src/codemode/sandbox/concurrency.js')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sandbox concurrency slots', () => {
  it('enforces capacity and resumes queued waiters after release', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT', '2')
    const { acquireSandboxSlot } = await loadConcurrency()
    const first = await acquireSandboxSlot()
    const second = await acquireSandboxSlot()
    const thirdPromise = acquireSandboxSlot()

    await expect(
      Promise.race([thirdPromise.then(() => 'slot'), Promise.resolve('pending')]),
    ).resolves.toBe('pending')

    first.release()
    const third = await thirdPromise

    second.release()
    third.release()
  })

  it('resumes queued waiters in FIFO order', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT', '1')
    const { acquireSandboxSlot } = await loadConcurrency()
    const held = await acquireSandboxSlot()
    const order: string[] = []
    const firstPromise = acquireSandboxSlot().then((slot) => {
      order.push('first')
      return slot
    })
    const secondPromise = acquireSandboxSlot().then((slot) => {
      order.push('second')
      return slot
    })

    held.release()
    const first = await firstPromise
    expect(order).toEqual(['first'])

    first.release()
    const second = await secondPromise
    expect(order).toEqual(['first', 'second'])
    second.release()
  })

  it('rejects immediately when the wait queue is full', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT', '1')
    const { acquireSandboxSlot } = await loadConcurrency()
    const held = await acquireSandboxSlot()
    const queued = [
      acquireSandboxSlot(),
      acquireSandboxSlot(),
      acquireSandboxSlot(),
      acquireSandboxSlot(),
    ]

    await expect(acquireSandboxSlot()).rejects.toThrow(/^Sandbox is at capacity/)

    held.release()
    for (const queuedSlotPromise of queued) {
      const queuedSlot = await queuedSlotPromise
      queuedSlot.release()
    }
  })

  it('removes aborted queued waiters without leaking a slot', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT', '1')
    const { acquireSandboxSlot } = await loadConcurrency()
    const held = await acquireSandboxSlot()
    const controller = new AbortController()
    const aborted = acquireSandboxSlot(controller.signal)

    controller.abort()
    await expect(aborted).rejects.toThrow()

    held.release()
    const next = await acquireSandboxSlot()
    next.release()
  })

  it('makes release idempotent', async () => {
    vi.stubEnv('DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT', '1')
    const { acquireSandboxSlot } = await loadConcurrency()
    const held = await acquireSandboxSlot()

    held.release()
    held.release()

    const first = await acquireSandboxSlot()
    const secondPromise = acquireSandboxSlot()

    await expect(
      Promise.race([secondPromise.then(() => 'slot'), Promise.resolve('pending')]),
    ).resolves.toBe('pending')

    first.release()
    const second = await secondPromise
    second.release()
  })
})
