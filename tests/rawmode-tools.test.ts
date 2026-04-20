import { afterEach, describe, expect, it, vi } from 'vitest'

const { invokeProcedureMock } = vi.hoisted(() => ({
  invokeProcedureMock: vi.fn(),
}))

vi.mock('../src/codemode/gateway/api-gateway.js', () => ({
  invokeProcedure: invokeProcedureMock,
}))

import { createRawModeTools } from '../src/rawmode/tools.js'

afterEach(() => {
  invokeProcedureMock.mockReset()
})

describe('rawmode tool handlers', () => {
  it('wraps scalar results into structuredContent.value', async () => {
    invokeProcedureMock.mockResolvedValue({
      data: 'ok',
      trace: {
        procedure: 'project.one',
        method: 'GET',
        startedAt: 0,
        finishedAt: 1,
        durationMs: 1,
      },
    })

    const tool = createRawModeTools({ enabledTags: ['project'] }).find(
      (entry) => entry.name === 'project.one',
    )

    expect(tool).toBeDefined()

    const result = await tool!.handler({ projectId: 'project-1' })
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toEqual({ value: 'ok' })
  })

  it('returns structured errors when gateway invocation fails', async () => {
    invokeProcedureMock.mockRejectedValue(new Error('gateway boom'))

    const tool = createRawModeTools({ enabledTags: ['project'] }).find(
      (entry) => entry.name === 'project.one',
    )

    expect(tool).toBeDefined()

    const result = await tool!.handler({ projectId: 'project-1' })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeInstanceOf(Error)
    expect((result.structuredContent as Error).message).toBe('gateway boom')
  })
})
