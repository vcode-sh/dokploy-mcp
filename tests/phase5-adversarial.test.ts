import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createResolvedConfig,
  listProfiles,
  resolveConfig,
  resolveProfileConfig,
} from '../src/config/resolver.js'
import {
  authorizeMcpRequest,
  handleMcpPreflight,
  parseAllowedOrigins,
  remoteDokployHeaderInputs,
  remoteDokployHeaders,
  withHttpRequestConfig,
} from '../src/http/security.js'
import type { ResolvedHttpServerOptions, SessionRecord } from '../src/http/types.js'

const ORIGINAL_ENV = { ...process.env }

class MockRequest extends EventEmitter {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>

  constructor(
    options: {
      method?: string
      url?: string
      headers?: Record<string, string | string[] | undefined>
    } = {},
  ) {
    super()
    this.method = options.method
    this.url = options.url
    this.headers = options.headers ?? {}
  }
}

class MockResponse extends EventEmitter {
  statusCode = 200
  writableEnded = false
  headersSent = false
  private headers = new Map<string, string | number | readonly string[]>()
  endBody?: string

  setHeader(name: string, value: string | number | readonly string[]) {
    this.headers.set(name.toLowerCase(), value)
  }

  getHeader(name: string) {
    return this.headers.get(name.toLowerCase())
  }

  end(body?: string) {
    this.writableEnded = true
    this.headersSent = true
    this.endBody = body
    return this
  }
}

function createOptions(
  overrides: Partial<ResolvedHttpServerOptions> = {},
): ResolvedHttpServerOptions {
  return {
    mode: 'codemode',
    enabledTags: undefined,
    capabilityFlags: undefined,
    host: '127.0.0.1',
    port: 3000,
    mcpPath: '/mcp',
    healthPath: '/health',
    allowedOrigins: [],
    allowConfigFallback: false,
    remoteHeaders: remoteDokployHeaderInputs,
    ...overrides,
  }
}

function createResponseBody(res: MockResponse) {
  return JSON.parse(res.endBody ?? '{}') as Record<string, unknown>
}

function createRemoteHeaders(overrides: Record<string, string> = {}) {
  return {
    [remoteDokployHeaders.url.name.toLowerCase()]: 'https://panel.example.com',
    [remoteDokployHeaders.apiKey.name.toLowerCase()]: 'test-api-key',
    ...overrides,
  }
}

function createSessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    server: {
      connect: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    } as unknown as SessionRecord['server'],
    transport: {
      handleRequest: vi.fn(() => Promise.resolve()),
    } as unknown as SessionRecord['transport'],
    resolvedConfig: createResolvedConfig(
      'https://panel.example.com',
      'test-api-key',
      'http-headers',
      30_000,
    ),
    ...overrides,
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('phase 5 adversarial coverage', () => {
  it('normalizes allowed origins without losing explicit entries', () => {
    expect(
      parseAllowedOrigins('https://a.example.com, https://b.example.com, https://a.example.com'),
    ).toEqual(['https://a.example.com', 'https://b.example.com'])
  })

  it('rejects preflight requests that omit the Origin header', () => {
    const req = new MockRequest({
      method: 'OPTIONS',
      url: '/mcp',
    }) as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse

    const handled = handleMcpPreflight(req, res, createOptions())

    expect(handled).toBe(true)
    expect((res as unknown as MockResponse).statusCode).toBe(400)
    expect(createResponseBody(res as unknown as MockResponse)).toEqual({
      ok: false,
      error: 'Origin header is required for preflight requests',
    })
  })

  it('rejects preflight requests whose origin is not allowlisted', () => {
    const req = new MockRequest({
      method: 'OPTIONS',
      url: '/mcp',
      headers: {
        origin: 'https://evil.example.com',
      },
    }) as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse

    const handled = handleMcpPreflight(
      req,
      res,
      createOptions({
        allowedOrigins: ['https://cursor.example.com'],
      }),
    )

    expect(handled).toBe(true)
    expect((res as unknown as MockResponse).statusCode).toBe(403)
    expect(createResponseBody(res as unknown as MockResponse)).toEqual({
      ok: false,
      error: 'Origin not allowed',
    })
  })

  it('rejects invalid remote Dokploy URLs before the MCP request reaches the runtime', () => {
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteHeaders({
        [remoteDokployHeaders.url.name.toLowerCase()]: 'not-a-url',
      }),
    }) as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse

    const config = authorizeMcpRequest(req, res, createOptions())

    expect(config).toBeNull()
    expect((res as unknown as MockResponse).statusCode).toBe(400)
    expect(createResponseBody(res as unknown as MockResponse)).toMatchObject({
      error: {
        code: -32000,
        message: expect.stringContaining('must be a valid http or https URL'),
      },
    })
  })

  it('can fall back to process-level Dokploy config for single-tenant HTTP mode when enabled', () => {
    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')

    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: {},
    }) as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse

    const config = authorizeMcpRequest(
      req,
      res,
      createOptions({
        allowConfigFallback: true,
      }),
    )

    expect(config).toEqual({
      url: 'https://env.example.com/api/trpc',
      apiKey: 'env-key',
      source: 'env',
      timeout: 30_000,
    })
  })

  it('binds allowed origins and remote credentials into the request-scoped config context', async () => {
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: {
        origin: 'https://cursor.example.com',
        ...createRemoteHeaders(),
      },
    }) as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse

    const config = authorizeMcpRequest(
      req,
      res,
      createOptions({
        allowedOrigins: ['https://cursor.example.com'],
      }),
    )

    expect(config).not.toBeNull()
    expect((res as unknown as MockResponse).getHeader('access-control-allow-origin')).toBe(
      'https://cursor.example.com',
    )

    const resolved = await withHttpRequestConfig(config!, async () => resolveConfig())
    expect(resolved).toEqual({
      url: 'https://panel.example.com/api/trpc',
      apiKey: 'test-api-key',
      source: 'http-headers',
      timeout: 30_000,
    })
  })

  it('does not allow request-scoped HTTP credentials to pivot into local named profiles', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'redivo-key',
        },
      }),
    )

    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteHeaders(),
    }) as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse
    const config = authorizeMcpRequest(req, res, createOptions())

    expect(config).not.toBeNull()

    const visibleProfiles = await withHttpRequestConfig(config!, async () => listProfiles())
    expect(visibleProfiles).toEqual([
      {
        name: 'default',
        url: 'https://panel.example.com/api/trpc',
        source: 'http-headers',
      },
    ])

    expect(await withHttpRequestConfig(config!, async () => resolveProfileConfig())).toEqual({
      url: 'https://panel.example.com/api/trpc',
      apiKey: 'test-api-key',
      source: 'http-headers',
      timeout: 30_000,
    })

    await expect(
      withHttpRequestConfig(config!, async () => resolveProfileConfig('redivo')),
    ).rejects.toThrow(
      'Named Dokploy profiles are unavailable when request-scoped HTTP credentials are active. Omit `profile` to use the bound session credentials.',
    )
  })

  it('accepts non-empty array header values and appends Origin to an existing Vary header', () => {
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: {
        origin: 'https://cursor.example.com',
        [remoteDokployHeaders.url.name.toLowerCase()]: ['  ', 'https://panel.example.com/api/'],
        [remoteDokployHeaders.apiKey.name.toLowerCase()]: ['  ', 'test-api-key'],
      },
    }) as unknown as IncomingMessage
    const res = new MockResponse()
    res.setHeader('vary', 'Accept-Encoding')

    const config = authorizeMcpRequest(
      req,
      res as unknown as ServerResponse,
      createOptions({
        allowedOrigins: ['https://cursor.example.com'],
      }),
    )

    expect(config).toEqual({
      url: 'https://panel.example.com/api/trpc',
      apiKey: 'test-api-key',
      source: 'http-headers',
      timeout: 30_000,
    })
    expect(res.getHeader('vary')).toBe('Accept-Encoding, Origin')
    expect(res.getHeader('access-control-allow-origin')).toBe('https://cursor.example.com')
  })

  it('rejects session requests whose credentials do not match the session-bound config', () => {
    const req = new MockRequest({
      method: 'GET',
      url: '/mcp',
      headers: createRemoteHeaders({
        [remoteDokployHeaders.url.name.toLowerCase()]: 'https://other.example.com',
        [remoteDokployHeaders.apiKey.name.toLowerCase()]: 'other-key',
      }),
    }) as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse
    const session = createSessionRecord()

    const config = authorizeMcpRequest(req, res, createOptions(), session)

    expect(config).toBeNull()
    expect((res as unknown as MockResponse).statusCode).toBe(403)
    expect(createResponseBody(res as unknown as MockResponse)).toMatchObject({
      error: {
        code: -32004,
        message: expect.stringContaining('do not match'),
      },
    })
  })
})
