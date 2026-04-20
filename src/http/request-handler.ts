import type { IncomingMessage, ServerResponse } from 'node:http'

import { isInitializeRequest, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'

import { getHealthPayload } from './options.js'
import {
  canWriteResponse,
  writeBadRequest,
  writeJson,
  writeJsonRpcError,
  writePayloadTooLarge,
  writeServerUnavailable,
  writeSessionNotFound,
} from './responses.js'
import { createSessionRecord } from './sessions.js'
import type {
  HttpRequestHandler,
  ResolvedHttpServerOptions,
  SessionRecord,
  SessionRegistry,
} from './types.js'

const MAX_JSON_BODY_BYTES = 1024 * 1024

class RequestBodyTooLargeError extends Error {
  constructor(limitBytes: number) {
    super(`Request body too large: limit is ${limitBytes} bytes`)
  }
}

function getDeclaredContentLength(req: IncomingMessage) {
  const header = req.headers['content-length']
  if (typeof header !== 'string') {
    return undefined
  }

  const parsed = Number.parseInt(header, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const declaredContentLength = getDeclaredContentLength(req)
  if (declaredContentLength !== undefined && declaredContentLength > MAX_JSON_BODY_BYTES) {
    req.resume()
    throw new RequestBodyTooLargeError(MAX_JSON_BODY_BYTES)
  }

  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let totalBytes = 0

    const cleanup = () => {
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('aborted', onAborted)
      req.off('close', onClose)
      req.off('error', onError)
    }

    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      totalBytes += buffer.byteLength

      if (totalBytes > MAX_JSON_BODY_BYTES) {
        cleanup()
        req.resume()
        reject(new RequestBodyTooLargeError(MAX_JSON_BODY_BYTES))
        return
      }

      chunks.push(buffer)
    }

    const onEnd = () => {
      cleanup()

      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw.length === 0 ? null : JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    }

    const onAborted = () => {
      cleanup()
      reject(new Error('Request body aborted'))
    }

    const onClose = () => {
      if (req.complete) {
        return
      }

      cleanup()
      reject(new Error('Request body closed before completion'))
    }

    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }

    req.on('data', onData)
    req.once('end', onEnd)
    req.once('aborted', onAborted)
    req.once('close', onClose)
    req.once('error', onError)
  })
}

function parseJsonRpcMessages(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.map((message) => JSONRPCMessageSchema.parse(message))
  }

  return [JSONRPCMessageSchema.parse(payload)]
}

function getSessionIdHeader(req: IncomingMessage) {
  const sessionId = req.headers['mcp-session-id']
  return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : undefined
}

function isInitializePayload(payload: unknown) {
  try {
    return parseJsonRpcMessages(payload).some((message) => isInitializeRequest(message))
  } catch {
    return null
  }
}

function getSessionRecord(req: IncomingMessage, res: ServerResponse, sessions: SessionRegistry) {
  const sessionId = getSessionIdHeader(req)
  if (!sessionId) {
    writeBadRequest(req, res, 'Bad Request: Mcp-Session-Id header is required')
    return null
  }

  const session = sessions.get(sessionId)
  if (!session) {
    writeSessionNotFound(req, res)
    return null
  }

  return session
}

async function handleTrackedSessionRequest(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: SessionRegistry,
  session: SessionRecord,
  parsedBody?: unknown,
) {
  const requestKind =
    req.method === 'GET' ? 'stream' : req.method === 'DELETE' ? 'control' : 'request'
  const abortRequest = () => {
    req.destroy()
    res.destroy()
  }

  if (!sessions.beginRequest(session, requestKind)) {
    writeServerUnavailable(req, res)
    return
  }

  if (requestKind !== 'control') {
    sessions.registerRequestAborter(session, abortRequest)
  }

  try {
    await session.transport.handleRequest(req, res, parsedBody)
  } finally {
    if (requestKind !== 'control') {
      sessions.unregisterRequestAborter(session, abortRequest)
    }

    await sessions.endRequest(session, requestKind)
  }
}

async function handleExistingPostSession(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: SessionRegistry,
  parsedBody: unknown,
) {
  const sessionId = getSessionIdHeader(req)
  if (!sessionId) {
    return false
  }

  const session = sessions.get(sessionId)
  if (!session) {
    writeSessionNotFound(req, res)
    return true
  }

  await handleTrackedSessionRequest(req, res, sessions, session, parsedBody)
  return true
}

async function handleInitializePostSession(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: SessionRegistry,
  options: ResolvedHttpServerOptions,
  parsedBody: unknown,
) {
  if (sessions.isShuttingDown()) {
    writeServerUnavailable(req, res)
    return
  }

  const session = createSessionRecord(sessions, options)
  if (!sessions.beginRequest(session, 'request')) {
    await sessions.closeRecord(session)
    writeServerUnavailable(req, res)
    return
  }

  try {
    await session.server.connect(session.transport)
    await session.transport.handleRequest(req, res, parsedBody)
  } catch (error) {
    const sessionId = session.transport.sessionId
    if (sessionId) {
      await sessions.closeSession(sessionId)
    } else {
      await sessions.closeRecord(session)
    }

    if (canWriteResponse(res)) {
      writeJsonRpcError(
        req,
        res,
        500,
        error instanceof Error ? error.message : 'Internal server error',
      )
    }
  } finally {
    await sessions.endRequest(session, 'request')
  }
}

async function handlePostRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: ResolvedHttpServerOptions,
  sessions: SessionRegistry,
) {
  let parsedBody: unknown

  try {
    parsedBody = await readJsonBody(req)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      writePayloadTooLarge(req, res, error.message)
      return
    }

    writeJsonRpcError(req, res, 400, 'Parse error: Invalid JSON', -32700)
    return
  }

  const initializePayload = isInitializePayload(parsedBody)
  if (initializePayload === null) {
    writeJsonRpcError(req, res, 400, 'Parse error: Invalid JSON-RPC message', -32700)
    return
  }

  if (await handleExistingPostSession(req, res, sessions, parsedBody)) {
    return
  }

  if (!initializePayload) {
    writeBadRequest(req, res, 'Bad Request: Mcp-Session-Id header is required')
    return
  }

  await handleInitializePostSession(req, res, sessions, options, parsedBody)
}

async function handleSessionRequest(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: SessionRegistry,
) {
  const session = getSessionRecord(req, res, sessions)
  if (!session) {
    return
  }

  await handleTrackedSessionRequest(req, res, sessions, session)
}

async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: ResolvedHttpServerOptions,
  sessions: SessionRegistry,
) {
  try {
    if (!(req.method && ['GET', 'POST', 'DELETE'].includes(req.method))) {
      writeJsonRpcError(req, res, 405, 'Method not allowed')
      return
    }

    if (req.method === 'POST') {
      await handlePostRequest(req, res, options, sessions)
      return
    }

    await handleSessionRequest(req, res, sessions)
  } catch (error) {
    if (canWriteResponse(res)) {
      writeJsonRpcError(
        req,
        res,
        500,
        error instanceof Error ? error.message : 'Internal server error',
      )
    }
  }
}

export function createHttpRequestHandler(
  options: ResolvedHttpServerOptions,
  sessions: SessionRegistry,
): HttpRequestHandler {
  return async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (url.pathname === options.healthPath) {
      if (req.method === 'GET' || req.method === 'HEAD') {
        writeJson(req, res, 200, getHealthPayload(options))
        return
      }

      writeJson(req, res, 405, { ok: false, error: 'Method not allowed' })
      return
    }

    if (url.pathname === options.mcpPath) {
      await handleMcpRequest(req, res, options, sessions)
      return
    }

    writeJson(req, res, 404, { ok: false, error: 'Not found' })
  }
}
