import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const { ApiErrorMock, apiGetMock, apiPostMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    status: number
    statusText: string
    body: unknown
    endpoint: string

    constructor(status: number, statusText: string, body: unknown, endpoint: string) {
      const message =
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string'
          ? body.message
          : statusText

      super(`Dokploy API error (${status}): ${message}`)
      this.name = 'ApiError'
      this.status = status
      this.statusText = statusText
      this.body = body
      this.endpoint = endpoint
    }
  }

  return {
    ApiErrorMock,
    apiGetMock: vi.fn(),
    apiPostMock: vi.fn(),
  }
})

vi.mock('../src/api/client.js', () => ({
  ApiError: ApiErrorMock,
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
}))

import { createTool, getTool, postTool } from '../src/mcp/tool-factory.js'

afterEach(() => {
  apiGetMock.mockReset()
  apiPostMock.mockReset()
})

describe('tool factory API integration', () => {
  it('filters undefined and null values before calling GET endpoints', async () => {
    apiGetMock.mockResolvedValue([{ projectId: 'project-1' }])

    const tool = getTool({
      name: 'project.search',
      title: 'Project Search',
      description: 'Search projects',
      schema: z.object({
        q: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().nullable().optional(),
      }),
      endpoint: '/project.search',
    })

    const result = await tool.handler({
      q: 'alpha',
      limit: undefined,
      offset: null,
    })

    expect(apiGetMock).toHaveBeenCalledWith('/project.search', { q: 'alpha' })
    expect(result.structuredContent).toEqual({
      items: [{ projectId: 'project-1' }],
    })
    expect(tool.method).toBe('GET')
    expect(tool.endpoint).toBe('/project.search')
  })

  it('forwards POST payloads unchanged and wraps scalar responses', async () => {
    apiPostMock.mockResolvedValue('ok')

    const tool = postTool({
      name: 'project.create',
      title: 'Project Create',
      description: 'Create project',
      schema: z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
      }),
      endpoint: '/project.create',
    })

    const result = await tool.handler({
      name: 'Alpha',
      description: null,
    })

    expect(apiPostMock).toHaveBeenCalledWith('/project.create', {
      name: 'Alpha',
      description: null,
    })
    expect(result.structuredContent).toEqual({ value: 'ok' })
    expect(tool.method).toBe('POST')
    expect(tool.endpoint).toBe('/project.create')
  })

  it('maps authentication failures to actionable error details', async () => {
    const tool = createTool({
      name: 'auth.test',
      title: 'Auth Test',
      description: 'Throws auth failure',
      schema: z.object({}),
      handler: async () => {
        throw new ApiErrorMock(401, 'Unauthorized', { message: 'bad key' }, '/auth.test')
      },
    })

    const result = await tool.handler({})
    const payload = JSON.parse(result.content[0]!.text)

    expect(result.isError).toBe(true)
    expect(payload).toEqual({
      error: 'Authentication failed',
      details:
        'Check your Dokploy API key. For stdio use DOKPLOY_API_KEY or local config; for remote HTTP use X-Dokploy-Api-Key.',
    })
  })

  it('surfaces validation bodies for 422 API failures', async () => {
    const tool = createTool({
      name: 'validation.test',
      title: 'Validation Test',
      description: 'Throws validation error',
      schema: z.object({}),
      handler: async () => {
        throw new ApiErrorMock(
          422,
          'Unprocessable Entity',
          { message: 'invalid', fieldErrors: { name: ['required'] } },
          '/validation.test',
        )
      },
    })

    const result = await tool.handler({})
    const payload = JSON.parse(result.content[0]!.text)

    expect(payload.error).toBe('Validation error')
    expect(payload.details).toContain('"fieldErrors"')
  })

  it('falls back to generic Dokploy API errors for unrecognized statuses', async () => {
    const tool = createTool({
      name: 'unknown.test',
      title: 'Unknown Error Test',
      description: 'Throws server error',
      schema: z.object({}),
      handler: async () => {
        throw new ApiErrorMock(500, 'Internal Server Error', { message: 'boom' }, '/unknown.test')
      },
    })

    const result = await tool.handler({})
    const payload = JSON.parse(result.content[0]!.text)

    expect(payload).toEqual({
      error: 'Dokploy API error (500)',
      details: 'Dokploy API error (500): boom',
    })
  })
})
