import { describe, expect, it } from 'vitest'

import { createExecuteTool } from '../src/codemode/tools/execute.js'

describe('phase 3 execute tool wrapper', () => {
  it('keeps the legacy code path working through the wrapped tool handler', async () => {
    const tool = createExecuteTool()
    const result = await tool.handler({
      code: 'return 1 + 1',
    })

    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({
      result: 2,
      logs: [],
      calls: [],
    })
  })

  it('requires exactly one of code or workflow', async () => {
    const tool = createExecuteTool()
    const result = await tool.handler({})

    expect(result.isError).toBe(true)
    expect(result.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('Provide exactly one of `code` or `workflow`.'),
        }),
      ]),
    )
  })

  it('returns a controlled tool error when workflow mode is used without a bound server instance', async () => {
    const tool = createExecuteTool()
    const result = await tool.handler({
      workflow: {
        kind: 'deploy-application',
        applicationId: 'app-1',
        intent: 'Preview the workflow.',
        action: 'preview',
      },
    })

    expect(result.isError).toBe(true)
    expect(result.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining(
            'Guided execute workflows require a bound MCP server instance.',
          ),
        }),
      ]),
    )
  })
})
