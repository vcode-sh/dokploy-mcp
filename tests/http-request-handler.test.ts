import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { describe, expect, it, vi } from 'vitest'

import { createResolvedConfig } from '../src/config/resolver.js'
import { createHttpRequestHandler } from '../src/http/request-handler.js'
import { remoteDokployHeaderInputs, remoteDokployHeaders } from '../src/http/security.js'
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
    allowedOrigins: [],
    allowConfigFallback: false,
    remoteHeaders: remoteDokployHeaderInputs,
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
    resolvedConfig: createResolvedConfig(
      'https://panel.example.com',
      'test-api-key',
      'http-headers',
      30_000,
    ),
    transportHandleRequest,
    ...overrides,
  }
}

function createRemoteAuthHeaders() {
  return {
    [remoteDokployHeaders.url.name.toLowerCase()]: 'https://panel.example.com',
    [remoteDokployHeaders.apiKey.name.toLowerCase()]: 'test-api-key',
  }
}

function parseResponseBody(res: MockResponse) {
  return JSON.parse(res.endBody ?? '{}') as Record<string, unknown>
}

function initializePayload() {
  return {
    jsonrpc: '2.0',
    method: 'initialize',
    id: 1,
    params: {
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
      protocolVersion: '2025-03-26',
      capabilities: {},
    },
  }
}

describe('http request handler', () => {
  it('rejects declared JSON bodies above the byte limit before reading the stream', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: {
        'content-length': String(1024 * 1024 + 1),
        ...createRemoteAuthHeaders(),
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

  it('rejects streamed JSON bodies that exceed the byte limit mid-read', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteAuthHeaders(),
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('data', Buffer.alloc(1024 * 1024 + 1, 'a'))
    await handling

    expect(res.statusCode).toBe(413)
    expect(res.getHeader('connection')).toBe('close')
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32000,
        message: expect.stringContaining('Request body too large'),
      },
    })
    expect(req.resumed).toBe(true)
  })

  it('returns a parse error when the request body is aborted mid-stream', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteAuthHeaders(),
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
      headers: createRemoteAuthHeaders(),
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

  it('returns a parse error when the request body emits an error event', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteAuthHeaders(),
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('error', new Error('stream failure'))
    await handling

    expect(res.statusCode).toBe(400)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
      },
    })
  })

  it('returns session not found for existing-session POST requests before reading the body', async () => {
    const sessions = createSessions({
      get: vi.fn(() => undefined),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: {
        'mcp-session-id': 'missing-session',
        ...createRemoteAuthHeaders(),
      },
    })
    const res = new MockResponse()

    await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(404)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32001,
        message: 'Session not found',
      },
    })
  })

  it('handles MCP preflight requests with a 204 when the origin is allowed', async () => {
    const handler = createHttpRequestHandler(
      createOptions({
        allowedOrigins: ['https://cursor.example.com'],
      }),
      createSessions(),
    )
    const req = new MockRequest({
      method: 'OPTIONS',
      url: '/mcp',
      headers: {
        origin: 'https://cursor.example.com',
      },
    })
    const res = new MockResponse()

    await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(204)
    expect(res.getHeader('access-control-allow-origin')).toBe('https://cursor.example.com')
  })

  it('ignores a close event after the request body is already complete', async () => {
    const sessions = createSessions({
      isShuttingDown: vi.fn(() => true),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteAuthHeaders(),
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('data', Buffer.from(JSON.stringify(initializePayload())))
    req.complete = true
    req.emit('close')
    req.emit('end')
    await handling

    expect(res.statusCode).toBe(503)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32002,
        message: 'Server is shutting down',
      },
    })
  })

  it('returns a parse error when the request body is valid JSON but not a JSON-RPC message', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteAuthHeaders(),
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('data', Buffer.from('{"hello":"world"}'))
    req.complete = true
    req.emit('end')
    await handling

    expect(res.statusCode).toBe(400)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON-RPC message',
      },
    })
  })

  it('accepts batch JSON-RPC payloads for existing tracked sessions', async () => {
    const session = createSessionRecord()
    const sessions = createSessions({
      get: vi.fn(() => session),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: {
        'mcp-session-id': 'session-1',
        ...createRemoteAuthHeaders(),
      },
    })
    const res = new MockResponse()
    const payload = [
      {
        jsonrpc: '2.0',
        method: 'ping',
        id: 1,
      },
    ]

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('data', Buffer.from(JSON.stringify(payload)))
    req.complete = true
    req.emit('end')
    await handling

    expect(session.transportHandleRequest).toHaveBeenCalledWith(req, res, payload)
  })

  it('returns 400 for MCP session requests that omit the session header', async () => {
    const handler = createHttpRequestHandler(createOptions(), createSessions())
    const req = new MockRequest({
      method: 'GET',
      url: '/mcp',
      headers: createRemoteAuthHeaders(),
    })
    const res = new MockResponse()

    await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(400)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32000,
        message: 'Bad Request: Mcp-Session-Id header is required',
      },
    })
  })

  it('returns 404 for MCP session requests that reference an unknown session', async () => {
    const sessions = createSessions({
      get: vi.fn(() => undefined),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'GET',
      url: '/mcp',
      headers: {
        'mcp-session-id': 'missing-session',
        ...createRemoteAuthHeaders(),
      },
    })
    const res = new MockResponse()

    await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(404)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32001,
        message: 'Session not found',
      },
    })
  })

  it('returns 503 when initialize reaches the server during shutdown', async () => {
    const sessions = createSessions({
      isShuttingDown: vi.fn(() => true),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteAuthHeaders(),
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('data', Buffer.from(JSON.stringify(initializePayload())))
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
  })

  it('returns 503 when initialize cannot begin a tracked session request', async () => {
    const sessions = createSessions({
      beginRequest: vi.fn(() => false),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'POST',
      url: '/mcp',
      headers: createRemoteAuthHeaders(),
    })
    const res = new MockResponse()

    const handling = handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    req.emit('data', Buffer.from(JSON.stringify(initializePayload())))
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
    expect(sessions.closeRecord).toHaveBeenCalledTimes(1)
  })

  it('treats DELETE requests as control requests without registering abort handlers', async () => {
    const session = createSessionRecord()
    const sessions = createSessions({
      get: vi.fn(() => session),
    })
    const handler = createHttpRequestHandler(createOptions(), sessions)
    const req = new MockRequest({
      method: 'DELETE',
      url: '/mcp',
      headers: {
        'mcp-session-id': 'session-1',
        ...createRemoteAuthHeaders(),
      },
    })
    const res = new MockResponse()

    await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)

    expect(session.transportHandleRequest).toHaveBeenCalledWith(req, res, undefined)
    expect(sessions.beginRequest).toHaveBeenCalledWith(session, 'control')
    expect(sessions.registerRequestAborter).not.toHaveBeenCalled()
    expect(sessions.unregisterRequestAborter).not.toHaveBeenCalled()
    expect(sessions.endRequest).toHaveBeenCalledWith(session, 'control')
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
        ...createRemoteAuthHeaders(),
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
        ...createRemoteAuthHeaders(),
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
