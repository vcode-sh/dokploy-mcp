import type { IncomingMessage, ServerResponse } from 'node:http'

import { isInitializeRequest, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'

import { getHealthPayload } from './options.js'
import { writeBadRequest, writeJson, writeJsonRpcError, writeSessionNotFound } from './responses.js'
import { closeSessionRecord, createSessionRecord } from './sessions.js'
import type { HttpRequestHandler, ResolvedHttpServerOptions, SessionRegistry } from './types.js'

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  return raw.length === 0 ? null : JSON.parse(raw)
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

  await session.transport.handleRequest(req, res, parsedBody)
  return true
}

async function handleInitializePostSession(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: SessionRegistry,
  options: ResolvedHttpServerOptions,
  parsedBody: unknown,
) {
  const session = createSessionRecord(sessions, options)

  try {
    await session.server.connect(session.transport)
    await session.transport.handleRequest(req, res, parsedBody)
  } catch (error) {
    const sessionId = session.transport.sessionId
    if (sessionId) {
      await sessions.closeSession(sessionId)
    } else {
      await closeSessionRecord(session)
    }

    if (!res.headersSent) {
      writeJsonRpcError(
        req,
        res,
        500,
        error instanceof Error ? error.message : 'Internal server error',
      )
    }
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
  } catch {
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

  await session.transport.handleRequest(req, res)
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
    if (!res.headersSent) {
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
