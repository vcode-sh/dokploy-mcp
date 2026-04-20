import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { afterEach, describe, expect, it, vi } from 'vitest'

class MockRequest extends EventEmitter {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  complete = true
  destroyed = false
  socket: {
    destroyed: boolean
    destroy: ReturnType<typeof vi.fn>
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
    this.socket = {
      destroyed: false,
      destroy: vi.fn(() => {
        this.socket.destroyed = true
      }),
    }
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

class FakeServer extends EventEmitter {
  listening = false
  headersTimeout = 0
  requestTimeout = 0
  keepAliveTimeout = 0
  addressValue: { address: string; port: number } | string | null = {
    address: '127.0.0.1',
    port: 3210,
  }
  requestListener?: (req: IncomingMessage, res: ServerResponse) => void
  closeImpl?: (callback?: (error?: unknown) => void) => void

  listen = vi.fn((_: number, __: string, callback?: () => void) => {
    this.listening = true
    callback?.()
    return this
  })

  close = vi.fn((callback?: (error?: unknown) => void) => {
    if (this.closeImpl) {
      this.closeImpl((error) => {
        if (!error) {
          this.listening = false
          this.emit('close')
        }
        callback?.(error)
      })
      return this
    }

    this.listening = false
    callback?.()
    this.emit('close')
    return this
  })

  address = vi.fn(() => this.addressValue)

  dispatchRequest(req: IncomingMessage, res: ServerResponse) {
    this.requestListener?.(req, res)
  }
}

interface LoadModuleResult {
  module: typeof import('../src/http-server.js')
  fakeServer: FakeServer
  requestHandlerMock: ReturnType<typeof vi.fn>
  closeAllMock: ReturnType<typeof vi.fn>
  beginShutdownMock: ReturnType<typeof vi.fn>
}

async function loadHttpServerModule(
  options: {
    requestHandlerError?: unknown
    closeError?: unknown
    addressValue?: FakeServer['addressValue']
  } = {},
): Promise<LoadModuleResult> {
  vi.resetModules()

  const fakeServer = new FakeServer()
  if (options.addressValue !== undefined) {
    fakeServer.addressValue = options.addressValue
  }
  if (options.closeError !== undefined) {
    fakeServer.closeImpl = (callback) => {
      callback?.(options.closeError)
    }
  }

  const requestHandlerMock = vi.fn(async () => {
    if (options.requestHandlerError !== undefined) {
      throw options.requestHandlerError
    }
  })
  const closeAllMock = vi.fn(() => Promise.resolve())
  const beginShutdownMock = vi.fn()

  vi.doMock('node:http', () => ({
    createServer: vi.fn((requestListener: (req: IncomingMessage, res: ServerResponse) => void) => {
      fakeServer.requestListener = requestListener
      return fakeServer
    }),
  }))

  vi.doMock('../src/http/options.js', () => ({
    resolveHttpOptions: vi.fn(() => ({
      mode: 'codemode',
      enabledTags: undefined,
      capabilityFlags: undefined,
      host: '127.0.0.1',
      port: 3210,
      mcpPath: '/mcp',
      healthPath: '/health',
    })),
  }))

  vi.doMock('../src/http/request-handler.js', () => ({
    createHttpRequestHandler: vi.fn(() => requestHandlerMock),
  }))

  vi.doMock('../src/http/sessions.js', () => ({
    createSessionRegistry: vi.fn(() => ({
      get: vi.fn(),
      trackRecord: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      isShuttingDown: vi.fn(() => false),
      beginShutdown: beginShutdownMock,
      beginRequest: vi.fn(() => true),
      endRequest: vi.fn(() => Promise.resolve()),
      registerRequestAborter: vi.fn(),
      unregisterRequestAborter: vi.fn(),
      closeRecord: vi.fn(() => Promise.resolve()),
      closeSession: vi.fn(() => Promise.resolve()),
      closeAll: closeAllMock,
    })),
  }))

  const module = await import('../src/http-server.js')
  return {
    module,
    fakeServer,
    requestHandlerMock,
    closeAllMock,
    beginShutdownMock,
  }
}

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('http server unit', () => {
  it('writes a clientError response only for non-destroyed sockets', async () => {
    const { module, fakeServer } = await loadHttpServerModule()
    const server = module.createHttpServer()
    const aliveSocket = {
      destroyed: false,
      end: vi.fn(),
    }
    const deadSocket = {
      destroyed: true,
      end: vi.fn(),
    }

    server.emit('clientError', new Error('boom'), aliveSocket)
    server.emit('clientError', new Error('boom'), deadSocket)

    expect(aliveSocket.end).toHaveBeenCalledWith(
      'HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n',
    )
    expect(deadSocket.end).not.toHaveBeenCalled()
    expect(fakeServer.headersTimeout).toBe(30_000)
    expect(fakeServer.requestTimeout).toBe(30_000)
    expect(fakeServer.keepAliveTimeout).toBe(5_000)
  })

  it('serializes request handler failures into JSON-RPC errors when the response is still writable', async () => {
    const { module, fakeServer, requestHandlerMock } = await loadHttpServerModule({
      requestHandlerError: new Error('handler boom'),
    })
    module.createHttpServer()
    const req = new MockRequest({
      method: 'GET',
      url: '/mcp',
    })
    const res = new MockResponse()

    fakeServer.dispatchRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    await new Promise((resolve) => setImmediate(resolve))

    expect(requestHandlerMock).toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
    expect(JSON.parse(res.endBody ?? '{}')).toMatchObject({
      error: {
        code: -32603,
        message: 'handler boom',
      },
    })
    expect(req.destroyed).toBe(false)
  })

  it('destroys the request when the response can no longer be written', async () => {
    const { module, fakeServer } = await loadHttpServerModule({
      requestHandlerError: 'late boom',
    })
    module.createHttpServer()
    const req = new MockRequest({
      method: 'GET',
      url: '/mcp',
    })
    const res = new MockResponse()
    res.headersSent = true

    fakeServer.dispatchRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    await new Promise((resolve) => setImmediate(resolve))

    expect(req.destroyed).toBe(true)
  })

  it('closes idle sockets during managed shutdown and reuses cleanup for repeated close calls', async () => {
    const { module, closeAllMock, beginShutdownMock } = await loadHttpServerModule()
    const server = module.createHttpServer()
    const socket = {
      setNoDelay: vi.fn(),
      setKeepAlive: vi.fn(),
      on: vi.fn(),
      end: vi.fn(),
      destroy: vi.fn(),
    }

    server.emit('connection', socket)
    fakeSetListening(server, true)

    const closeResults = await Promise.all([
      closeServerWithCallback(server),
      closeServerWithCallback(server),
    ])

    expect(closeResults).toEqual([undefined, undefined])
    expect(beginShutdownMock).toHaveBeenCalled()
    expect(closeAllMock).toHaveBeenCalledTimes(1)
    expect(socket.end).toHaveBeenCalled()
  })

  it('maps :: addresses to 127.0.0.1 in started URLs', async () => {
    const { module } = await loadHttpServerModule({
      addressValue: { address: '::', port: 4321 },
    })

    const handle = await module.startHttpServer()
    expect(handle.url).toBe('http://127.0.0.1:4321')
    expect(handle.mcpUrl).toBe('http://127.0.0.1:4321/mcp')
    expect(handle.healthUrl).toBe('http://127.0.0.1:4321/health')
  })

  it('rejects startup when the server address is not TCP', async () => {
    const { module } = await loadHttpServerModule({
      addressValue: 'pipe',
    })

    await expect(module.startHttpServer()).rejects.toThrow(
      'Expected HTTP server to have a TCP address',
    )
  })

  it('wraps non-Error close failures for callback-based callers', async () => {
    const { module } = await loadHttpServerModule({
      closeError: 'close failed',
    })
    const server = module.createHttpServer()
    fakeSetListening(server, true)

    const error = await new Promise<Error | undefined>((resolve) => {
      server.close((nextError) => {
        resolve(nextError)
      })
    })

    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toBe('close failed')
  })
})

function fakeSetListening(server: ReturnType<typeof vi.fn> | unknown, value: boolean) {
  ;(server as FakeServer).listening = value
}

async function closeServerWithCallback(server: ReturnType<typeof vi.fn> | unknown) {
  return await new Promise<void>((resolve, reject) => {
    ;(server as FakeServer).close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}
