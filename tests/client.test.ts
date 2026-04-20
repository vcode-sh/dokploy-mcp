import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  api,
  buildQueryString,
  resetApiClientCachesForTests,
  unwrapTrpcResponse,
} from '../src/api/client.js'

beforeEach(() => {
  resetApiClientCachesForTests()
})

afterEach(() => {
  resetApiClientCachesForTests()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ApiError', () => {
  it('extracts message from body object', () => {
    const err = new ApiError(400, 'Bad Request', { message: 'Invalid input' }, 'test.endpoint')
    expect(err.message).toBe('Dokploy API error (400): Invalid input')
    expect(err.status).toBe(400)
    expect(err.statusText).toBe('Bad Request')
    expect(err.endpoint).toBe('test.endpoint')
    expect(err.name).toBe('ApiError')
  })

  it('falls back to statusText when body has no message', () => {
    const err = new ApiError(500, 'Internal Server Error', null, 'test.endpoint')
    expect(err.message).toBe('Dokploy API error (500): Internal Server Error')
  })

  it('falls back to statusText for non-object body', () => {
    const err = new ApiError(502, 'Bad Gateway', 'raw text', 'test.endpoint')
    expect(err.message).toBe('Dokploy API error (502): Bad Gateway')
  })

  it('handles body object without message property', () => {
    const err = new ApiError(422, 'Unprocessable', { errors: ['field required'] }, 'test.create')
    expect(err.message).toBe('Dokploy API error (422): Unprocessable')
    expect(err.body).toEqual({ errors: ['field required'] })
  })

  it('extracts nested tRPC error messages', () => {
    const err = new ApiError(
      400,
      'Bad Request',
      {
        error: {
          json: {
            message: 'Invalid input: expected object, received undefined',
          },
        },
      },
      'test.one',
    )

    expect(err.message).toBe(
      'Dokploy API error (400): Invalid input: expected object, received undefined',
    )
  })

  it('is instanceof Error', () => {
    const err = new ApiError(404, 'Not Found', null, 'test.one')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
  })

  it('preserves body for downstream inspection', () => {
    const body = { code: 'VALIDATION', fields: { name: 'required' } }
    const err = new ApiError(422, 'Unprocessable', body, 'test.create')
    expect(err.body).toBe(body)
  })
})

describe('buildQueryString', () => {
  it('returns empty string for empty input', () => {
    expect(buildQueryString(undefined)).toBe('')
    expect(buildQueryString({})).toBe('input=%7B%22json%22%3A%7B%7D%7D')
  })

  it('serializes GET params using the tRPC input envelope', () => {
    expect(buildQueryString({ projectId: 'abc123' })).toBe(
      'input=%7B%22json%22%3A%7B%22projectId%22%3A%22abc123%22%7D%7D',
    )
  })

  it('filters nullish values and preserves arrays', () => {
    expect(
      buildQueryString({
        q: 'app',
        limit: 20,
        watchPaths: ['src', 'package.json'],
        owner: null,
      }),
    ).toBe(
      'input=%7B%22json%22%3A%7B%22q%22%3A%22app%22%2C%22limit%22%3A20%2C%22watchPaths%22%3A%5B%22src%22%2C%22package.json%22%5D%7D%7D',
    )
  })
})

describe('getBackendVersionInfo', () => {
  it('caches successful version probes across calls', async () => {
    vi.stubEnv('DOKPLOY_URL', 'https://dokploy.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'test-api-key')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      async text() {
        return JSON.stringify({
          result: {
            data: {
              json: 'v0.28.8',
            },
          },
        })
      },
    })

    vi.stubGlobal('fetch', fetchMock)

    const first = await api.getBackendVersionInfo()
    const second = await api.getBackendVersionInfo()

    expect(first).toEqual({ state: 'detected', version: 'v0.28.8' })
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dokploy.example.com/api/trpc/settings.getDokployVersion',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key',
        }),
      }),
    )
  })

  it('caches unsupported version probes to avoid repeated compatibility checks', async () => {
    vi.stubEnv('DOKPLOY_URL', 'https://dokploy.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'test-api-key')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      async text() {
        return JSON.stringify({ message: 'missing' })
      },
    })

    vi.stubGlobal('fetch', fetchMock)

    const first = await api.getBackendVersionInfo()
    const second = await api.getBackendVersionInfo()

    expect(first).toEqual({ state: 'unsupported', version: null })
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('accepts version payloads returned as objects', async () => {
    vi.stubEnv('DOKPLOY_URL', 'https://dokploy.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'test-api-key')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      async text() {
        return JSON.stringify({
          result: {
            data: {
              json: {
                version: 'v0.29.0',
              },
            },
          },
        })
      },
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(api.getBackendVersionInfo()).resolves.toEqual({
      state: 'detected',
      version: 'v0.29.0',
    })
  })

  it('does not cache unavailable probe failures forever', async () => {
    vi.stubEnv('DOKPLOY_URL', 'https://dokploy.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'test-api-key')

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        async text() {
          return JSON.stringify({
            result: {
              data: {
                json: 'v0.28.8',
              },
            },
          })
        },
      })

    vi.stubGlobal('fetch', fetchMock)

    await expect(api.getBackendVersionInfo()).resolves.toEqual({
      state: 'unavailable',
      version: null,
    })
    await expect(api.getBackendVersionInfo()).resolves.toEqual({
      state: 'detected',
      version: 'v0.28.8',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('unwrapTrpcResponse', () => {
  it('unwraps the standard tRPC response envelope', () => {
    expect(
      unwrapTrpcResponse({
        result: {
          data: {
            json: {
              projectId: 'abc123',
            },
          },
        },
      }),
    ).toEqual({ projectId: 'abc123' })
  })

  it('returns non-tRPC payloads unchanged', () => {
    const payload = [{ projectId: 'abc123' }]
    expect(unwrapTrpcResponse(payload)).toBe(payload)
  })
})

describe('request helpers', () => {
  it('turns aborted requests into timeout errors', async () => {
    vi.stubEnv('DOKPLOY_URL', 'https://dokploy.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'test-api-key')

    const abortError = new Error('aborted')
    abortError.name = 'AbortError'

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(api.get('/project.all')).rejects.toThrow(
      'Request to /project.all timed out after 30000ms',
    )
  })
})
