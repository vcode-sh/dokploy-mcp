import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { describe, expect, it, vi } from 'vitest'

import { createHttpRequestHandler } from '../src/http/request-handler.js'
import type {
  ResolvedHttpServerOptions,
  SessionRecord,
  SessionRegistry,
} from '../src/http/types.js'

class MockRequest extends EventEmitter {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  complete = false
  socket: { destroyed: boolean; destroy: ReturnType<typeof vi.fn> }
  destroyed = false
  resumed = false

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
    this.socket = {
      destroyed: false,
      destroy: vi.fn(() => {
        this.socket.destroyed = true
      }),
    }
  }

  resume() {
    this.resumed = true
  }

  destroy() {
    this.destroyed = true
  }
}

class MockResponse extends EventEmitter {
  statusCode = 200
  destroyed = false
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
    this.emit('finish')
    this.emit('close')
    return this
  }

  destroy() {
    this.destroyed = true
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
    ...overrides,
  }
}

function createSessions(overrides: Partial<SessionRegistry> = {}): SessionRegistry {
  return {
    get: vi.fn(),
    trackRecord: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    isShuttingDown: vi.fn(() => false),
    beginShutdown: vi.fn(),
    beginRequest: vi.fn(() => true),
    endRequest: vi.fn(() => Promise.resolve()),
    registerRequestAborter: vi.fn(),
    unregisterRequestAborter: vi.fn(),
    closeRecord: vi.fn(() => Promise.resolve()),
    closeSession: vi.fn(() => Promise.resolve()),
    closeAll: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
}

function createSessionRecord(
  overrides: Partial<SessionRecord> = {},
): SessionRecord & { transportHandleRequest: ReturnType<typeof vi.fn> } {
  const transportHandleRequest = vi.fn(() => Promise.resolve())

  return {
    server: {
      connect: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    } as unknown as SessionRecord['server'],
    transport: {
      handleRequest: transportHandleRequest,
    } as unknown as SessionRecord['transport'],
    transportHandleRequest,
    ...overrides,
  }
}

function parseResponseBody(res: MockResponse) {
  return JSON.parse(res.endBody ?? '{}') as Record<string, unknown>
}

describe('http request handler', () => {
  it('rejects declared JSON bodies above the byte limit before reading the stream', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: {
        'content-length': String(1024 * 1024 + 1),
      },
    }) as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse

    await handler(req, res)

    const typedRes = res as unknown as MockResponse
    expect(typedRes.statusCode).toBe(413)
    expect(typedRes.getHeader('connection')).toBe('close')
    expect(parseResponseBody(typedRes)).toMatchObject({
      error: {
        code: -32000,
        message: expect.stringContaining('Request body too large'),
      },
    })
    expect((req as unknown as MockRequest).resumed).toBe(true)
  })

  it('returns a parse error when the request body is aborted mid-stream', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('aborted')
    await handling

    expect(res.statusCode).toBe(400)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
      },
    })
  })

  it('returns a parse error when the request body closes before completion', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('close')
    await handling

    expect(res.statusCode).toBe(400)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
      },
    })
  })

  it('returns 503 when an existing session cannot begin a tracked POST request', async () => {
    const session = createSessionRecord()
    const sessions = createSessions({
      get: vi.fn(() => session),
      beginRequest: vi.fn(() => false),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: {
        'mcp-session-id': 'session-1',
      },
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('data', Buffer.from('{"jsonrpc":"2.0","method":"ping","id":1}'))
    req.complete = true
    req.emit('end')
    await handling

    expect(res.statusCode).toBe(503)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32002,
        message: 'Server is shutting down',
      },
    })
    expect(session.transportHandleRequest).not.toHaveBeenCalled()
  })

  it('returns 500 when session transport handling throws during a tracked request', async () => {
    const session = createSessionRecord({
      transport: {
        handleRequest: vi.fn(async () => {
          throw new Error('transport boom')
        }),
      } as unknown as SessionRecord['transport'],
    })
    const sessions = createSessions({
      get: vi.fn(() => session),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'GET',
      url: '/mcp',
      headers: {
        'mcp-session-id': 'session-1',
      },
    })
    const res = new MockResponse()

    await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(500)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32603,
        message: 'transport boom',
      },
    })
  })
})
