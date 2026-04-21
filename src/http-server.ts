import {
  createServer as createNodeServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo, Socket } from 'node:net'

import { resolveHttpOptions } from './http/options.js'
import { createHttpRequestHandler } from './http/request-handler.js'
import { canWriteResponse, writeJsonRpcError } from './http/responses.js'
import { createSessionRegistry } from './http/sessions.js'
import type { HttpServerOptions, StartedHttpServer } from './http/types.js'
import { parseEnabledTags, parseServerMode, type ServerMode } from './server.js'

export type { HttpServerOptions, StartedHttpServer } from './http/types.js'

const REQUEST_SHUTDOWN_GRACE_MS = 1_000
const HTTP_HEADERS_TIMEOUT_MS = 30_000
const HTTP_REQUEST_TIMEOUT_MS = 30_000
const HTTP_KEEP_ALIVE_TIMEOUT_MS = 5_000
type NodeServer = ReturnType<typeof createNodeServer>
type NodeServerCloseCallback = (error?: Error) => void
type NodeServerClose = (callback?: NodeServerCloseCallback) => Server

function getAddressInfo(server: NodeServer) {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected HTTP server to have a TCP address')
  }

  return address as AddressInfo
}

async function waitForServerClose(server: NodeServer, closeServer: NodeServerClose) {
  if (!server.listening) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    closeServer((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

function hasEventStreamContentType(res: ServerResponse) {
  const contentType = res.getHeader('content-type')
  if (typeof contentType === 'string') {
    return contentType.includes('text/event-stream')
  }

  if (Array.isArray(contentType)) {
    return contentType.some((value) => value.includes('text/event-stream'))
  }

  return false
}

function createActiveRequestTracker(isShuttingDown: () => boolean) {
  const socketStates = new Map<Socket, { activeRequests: number }>()
  const activeRequests = new Set<{
    req: IncomingMessage
    res: ServerResponse
    socket: Socket
    bodyComplete: boolean
  }>()

  return {
    onConnection(socket: Socket) {
      socket.setNoDelay(true)
      socket.setKeepAlive(true)
      socketStates.set(socket, { activeRequests: 0 })

      socket.on('close', () => {
        socketStates.delete(socket)
      })
    },
    trackRequest(req: IncomingMessage, res: ServerResponse) {
      const socket = req.socket
      const socketState = socketStates.get(socket) ?? { activeRequests: 0 }
      if (!socketStates.has(socket)) {
        socketStates.set(socket, socketState)
      }
      socketState.activeRequests += 1

      const activeRequest = {
        req,
        res,
        socket,
        bodyComplete: req.complete,
      }
      let cleaned = false

      activeRequests.add(activeRequest)

      req.on('end', () => {
        activeRequest.bodyComplete = true
      })

      const cleanup = () => {
        if (cleaned) {
          return
        }

        cleaned = true
        activeRequests.delete(activeRequest)

        const trackedSocket = socketStates.get(socket)
        if (trackedSocket) {
          trackedSocket.activeRequests = Math.max(0, trackedSocket.activeRequests - 1)
          if (isShuttingDown() && trackedSocket.activeRequests === 0) {
            socket.end()
          }
        }
      }

      res.on('finish', cleanup)
      res.on('close', cleanup)
    },
    closeIdleSockets() {
      for (const [socket, state] of socketStates) {
        if (state.activeRequests === 0) {
          socket.end()
        }
      }
    },
    abortBlockingRequests() {
      for (const activeRequest of activeRequests) {
        const shouldAbort =
          !activeRequest.bodyComplete ||
          hasEventStreamContentType(activeRequest.res) ||
          !activeRequest.res.writableEnded

        if (!shouldAbort) {
          continue
        }

        activeRequest.req.destroy()
        activeRequest.res.destroy()
        activeRequest.socket.destroy()
      }
    },
  }
}

function configureServerRuntime(server: NodeServer) {
  server.headersTimeout = HTTP_HEADERS_TIMEOUT_MS
  server.requestTimeout = HTTP_REQUEST_TIMEOUT_MS
  server.keepAliveTimeout = HTTP_KEEP_ALIVE_TIMEOUT_MS

  server.on('clientError', (_error, socket) => {
    if (socket.destroyed) {
      return
    }

    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
  })
}

function installManagedClose(server: NodeServer, closeManaged: () => Promise<void>) {
  const closeServer = server.close.bind(server) as NodeServerClose

  server.close = ((callback?: NodeServerCloseCallback) => {
    const closePromise = closeManaged()
    if (callback) {
      void closePromise.then(
        () => {
          callback()
        },
        (error) => {
          callback(error instanceof Error ? error : new Error(String(error)))
        },
      )
    }

    return server
  }) as NodeServerClose

  return closeServer
}

function createManagedHttpServer(options: HttpServerOptions = {}) {
  const resolved = resolveHttpOptions(options)
  const sessions = createSessionRegistry()
  const requestHandler = createHttpRequestHandler(resolved, sessions)
  const requests = createActiveRequestTracker(() => sessions.isShuttingDown())
  const server = createNodeServer((req, res) => {
    requests.trackRequest(req, res)

    void requestHandler(req, res).catch((error) => {
      if (canWriteResponse(res)) {
        writeJsonRpcError(
          req,
          res,
          500,
          error instanceof Error ? error.message : 'Internal server error',
        )
        return
      }

      req.destroy(error instanceof Error ? error : new Error(String(error)))
    })
  })
  let closePromise: Promise<void> | undefined
  let cleanupPromise: Promise<void> | undefined

  function beginShutdown() {
    sessions.beginShutdown()
  }

  configureServerRuntime(server)
  server.on('connection', requests.onConnection)

  function ensureCleanup() {
    cleanupPromise ??= sessions.closeAll()
    return cleanupPromise
  }

  let closeServer!: NodeServerClose

  server.on('close', () => {
    beginShutdown()
    void ensureCleanup()
  })

  const close = async () => {
    if (closePromise) {
      return closePromise
    }

    beginShutdown()
    closePromise = (async () => {
      const closeWait = waitForServerClose(server, closeServer)
      requests.closeIdleSockets()

      const forceAbortTimer = setTimeout(() => {
        requests.abortBlockingRequests()
      }, REQUEST_SHUTDOWN_GRACE_MS)

      forceAbortTimer.unref?.()

      try {
        await closeWait
        await ensureCleanup()
      } finally {
        clearTimeout(forceAbortTimer)
      }
    })()

    return closePromise
  }

  closeServer = installManagedClose(server, close)

  return {
    resolved,
    server,
    close,
  }
}

export function createHttpServer(options: HttpServerOptions = {}) {
  return createManagedHttpServer(options).server
}

export async function startHttpServer(options: HttpServerOptions = {}): Promise<StartedHttpServer> {
  const managed = createManagedHttpServer(options)
  const { resolved, server } = managed

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(resolved.port, resolved.host, () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = getAddressInfo(server)
  const host = address.address === '::' ? '127.0.0.1' : address.address
  const baseUrl = `http://${host}:${address.port}`

  return {
    server,
    url: baseUrl,
    mcpUrl: `${baseUrl}${resolved.mcpPath}`,
    healthUrl: `${baseUrl}${resolved.healthPath}`,
    close: managed.close,
  }
}

export function resolveHttpServerMode(value?: string): ServerMode | undefined {
  return parseServerMode(value)
}

export function resolveHttpEnabledTags(value?: string) {
  return parseEnabledTags(value)
}
