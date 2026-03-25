import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTool, getTool, postTool } from '../src/mcp/tool-factory.js'

describe('createTool', () => {
  it('creates a tool with correct structure', () => {
    const tool = createTool({
      name: 'test_tool',
      title: 'Test Tool',
      description: 'A test tool',
      schema: z.object({ id: z.string() }),
      annotations: { readOnlyHint: true },
      handler: async () => ({ test: true }),
    })

    expect(tool.name).toBe('test_tool')
    expect(tool.title).toBe('Test Tool')
    expect(tool.description).toBe('A test tool')
    expect(tool.annotations.readOnlyHint).toBe(true)
    expect(tool.annotations.openWorldHint).toBe(true) // default
  })

  it('allows overriding openWorldHint default', () => {
    const tool = createTool({
      name: 'test_closed',
      title: 'Closed Tool',
      description: 'A closed-world tool',
      schema: z.object({}),
      annotations: { openWorldHint: false },
      handler: async () => ({}),
    })

    expect(tool.annotations.openWorldHint).toBe(false)
  })

  it('handler returns success format on success', async () => {
    const tool = createTool({
      name: 'test_success',
      title: 'Success Tool',
      description: 'Returns data',
      schema: z.object({}),
      annotations: {},
      handler: async () => ({ message: 'ok' }),
    })

    const result = await tool.handler({})
    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(1)
    expect(result.content[0]!.type).toBe('text')
    expect(JSON.parse(result.content[0]!.text)).toEqual({ message: 'ok' })
    expect(result.structuredContent).toEqual({ message: 'ok' })
  })

  it('handler returns error format on ApiError', async () => {
    const { ApiError } = await import('../src/api/client.js')

    const tool = createTool({
      name: 'test_api_error',
      title: 'Error Tool',
      description: 'Throws ApiError',
      schema: z.object({}),
      annotations: {},
      handler: async () => {
        throw new ApiError(404, 'Not Found', null, 'test.endpoint')
      },
    })

    const result = await tool.handler({})
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.error).toBe('Resource not found')
  })

  it('handler returns error format on generic error', async () => {
    const tool = createTool({
      name: 'test_generic_error',
      title: 'Error Tool',
      description: 'Throws generic error',
      schema: z.object({}),
      annotations: {},
      handler: async () => {
        throw new Error('Something broke')
      },
    })

    const result = await tool.handler({})
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.details).toBe('Something broke')
  })
})

describe('getTool', () => {
  it('sets readOnly and idempotent annotations by default', () => {
    const tool = getTool({
      name: 'test_get',
      title: 'Get Test',
      description: 'A GET tool',
      schema: z.object({ id: z.string() }),
      endpoint: 'test.get',
    })

    expect(tool.annotations.readOnlyHint).toBe(true)
    expect(tool.annotations.idempotentHint).toBe(true)
    expect(tool.annotations.openWorldHint).toBe(true)
  })

  it('allows annotation overrides', () => {
    const tool = getTool({
      name: 'test_get_override',
      title: 'Get Override',
      description: 'Override test',
      schema: z.object({}),
      endpoint: 'test.get',
      annotations: { readOnlyHint: false },
    })

    expect(tool.annotations.readOnlyHint).toBe(false)
  })
})

describe('postTool', () => {
  it('does not set readOnly annotation', () => {
    const tool = postTool({
      name: 'test_post',
      title: 'Post Test',
      description: 'A POST tool',
      schema: z.object({ name: z.string() }),
      endpoint: 'test.post',
    })

    expect(tool.annotations.readOnlyHint).toBeUndefined()
    expect(tool.annotations.openWorldHint).toBe(true)
  })

  it('passes destructiveHint through', () => {
    const tool = postTool({
      name: 'test_destructive',
      title: 'Destructive Post',
      description: 'Deletes stuff',
      schema: z.object({}),
      endpoint: 'test.delete',
      annotations: { destructiveHint: true },
    })

    expect(tool.annotations.destructiveHint).toBe(true)
  })
})
