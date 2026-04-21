import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { afterEach, describe, expect, it, vi } from 'vitest'

const { createSessionRecordMock } = vi.hoisted(() => ({
  createSessionRecordMock: vi.fn(),
}))

vi.mock('../src/http/sessions.js', async () => {
  const actual =
    await vi.importActual<typeof import('../src/http/sessions.js')>('../src/http/sessions.js')

  return {
    ...actual,
    createSessionRecord: createSessionRecordMock,
  }
})

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
  socket = {
    destroyed: false,
    destroy: vi.fn(() => {
      this.socket.destroyed = true
    }),
  }

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

  resume() {
    return undefined
  }

  destroy() {
    this.socket.destroyed = true
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
    this.emit('finish')
    this.emit('close')
    return this
  }

  destroy() {
    this.writableEnded = true
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

function createRemoteAuthHeaders() {
  return {
    [remoteDokployHeaders.url.name.toLowerCase()]: 'https://panel.example.com',
    [remoteDokployHeaders.apiKey.name.toLowerCase()]: 'test-api-key',
  }
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

function parseResponseBody(res: MockResponse) {
  return JSON.parse(res.endBody ?? '{}') as Record<string, unknown>
}

function createMockSessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    server: {
      connect: vi.fn(() => Promise.reject(new Error('connect boom'))),
      close: vi.fn(() => Promise.resolve()),
    } as unknown as SessionRecord['server'],
    transport: {
      sessionId: 'session-1',
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
  createSessionRecordMock.mockReset()
  vi.restoreAllMocks()
})

describe('http request handler phase 5 error paths', () => {
  it('closes the created session by id when initialize setup fails after the transport session id exists', async () => {
    const session = createMockSessionRecord()
    const sessions = createSessions()
    createSessionRecordMock.mockReturnValue(session)

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

    expect(sessions.closeSession).toHaveBeenCalledWith('session-1')
    expect(sessions.closeRecord).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32603,
        message: 'connect boom',
      },
    })
  })

  it('closes the created session record directly when initialize setup fails before a session id exists', async () => {
    const session = createMockSessionRecord({
      transport: {
        handleRequest: vi.fn(() => Promise.resolve()),
      } as unknown as SessionRecord['transport'],
    })
    const sessions = createSessions()
    createSessionRecordMock.mockReturnValue(session)

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

    expect(sessions.closeRecord).toHaveBeenCalledWith(session)
    expect(sessions.closeSession).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
    expect(parseResponseBody(res)).toMatchObject({
      error: {
        code: -32603,
        message: 'connect boom',
      },
    })
  })
})
