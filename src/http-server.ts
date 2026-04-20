import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import {
  createServer as createNodeServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'

import {
  type CreateServerOptions,
  createServer,
  parseEnabledTags,
  parseServerMode,
  type ServerMode,
} from './server.js'

const DEFAULT_HTTP_HOST = '127.0.0.1'
const DEFAULT_HTTP_PORT = 3000
const DEFAULT_MCP_PATH = '/mcp'
const DEFAULT_HEALTH_PATH = '/health'

export interface HttpServerOptions extends CreateServerOptions {
  host?: string
  port?: number
  mcpPath?: string
  healthPath?: string
}

export interface StartedHttpServer {
  server: ReturnType<typeof createNodeServer>
  url: string
  mcpUrl: string
  healthUrl: string
  close: () => Promise<void>
}

interface ResolvedHttpServerOptions {
  mode: ServerMode
  enabledTags?: string[]
  host: string
  port: number
  mcpPath: string
  healthPath: string
}

interface SessionRecord {
  server: McpServer
  transport: StreamableHTTPServerTransport
}

function parsePort(value?: string) {
  if (!value) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function normalizePath(pathname: string | undefined, fallback: string) {
  if (!pathname) {
    return fallback
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

function resolveHttpOptions(options: HttpServerOptions = {}): ResolvedHttpServerOptions {
  return {
    mode: options.mode ?? 'codemode',
    enabledTags: options.enabledTags,
    host: options.host ?? process.env.DOKPLOY_MCP_HTTP_HOST ?? DEFAULT_HTTP_HOST,
    port: options.port ?? parsePort(process.env.DOKPLOY_MCP_HTTP_PORT) ?? DEFAULT_HTTP_PORT,
    mcpPath: normalizePath(options.mcpPath ?? process.env.DOKPLOY_MCP_HTTP_PATH, DEFAULT_MCP_PATH),
    healthPath: normalizePath(
      options.healthPath ?? process.env.DOKPLOY_MCP_HEALTH_PATH,
      DEFAULT_HEALTH_PATH,
    ),
  }
}

function getHealthPayload(options: ResolvedHttpServerOptions) {
  return {
    ok: true,
    transport: 'http',
    mode: options.mode,
    enabledTags: options.enabledTags ?? [],
    mcpPath: options.mcpPath,
    healthPath: options.healthPath,
  }
}

function writeJson(
  req: IncomingMessage,
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
) {
  const body = JSON.stringify(payload)
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json')
  res.setHeader('content-length', Buffer.byteLength(body, 'utf8'))

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  res.end(body)
}

function writeJsonRpcError(
  req: IncomingMessage,
  res: ServerResponse,
  statusCode: number,
  message: string,
  code = -32603,
) {
  writeJson(req, res, statusCode, {
    jsonrpc: '2.0',
    error: {
      code,
      message,
    },
    id: null,
  })
}

function getAddressInfo(server: ReturnType<typeof createNodeServer>) {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected HTTP server to have a TCP address')
  }

  return address as AddressInfo
}

async function closeServer(server: ReturnType<typeof createNodeServer>) {
  server.close()
  await once(server, 'close')
}

async function closeSessionRecord(record: SessionRecord) {
  await Promise.allSettled([record.transport.close(), record.server.close()])
}

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

function writeBadRequest(req: IncomingMessage, res: ServerResponse, message: string) {
  writeJsonRpcError(req, res, 400, message, -32000)
}

function writeSessionNotFound(req: IncomingMessage, res: ServerResponse) {
  writeJsonRpcError(req, res, 404, 'Session not found', -32001)
}

function createSessionRecord(
  sessions: Map<string, SessionRecord>,
  options: ResolvedHttpServerOptions,
): SessionRecord {
  const server = createServer({
    mode: options.mode,
    enabledTags: options.enabledTags,
  })

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, record)
    },
    onsessionclosed: async (sessionId) => {
      const session = sessions.get(sessionId)
      if (!session) {
        return
      }

      sessions.delete(sessionId)
      await session.server.close()
    },
  })

  const record: SessionRecord = {
    server,
    transport,
  }

  transport.onclose = () => {
    const sessionId = transport.sessionId
    if (!sessionId) {
      return
    }

    sessions.delete(sessionId)
  }

  return record
}

function getSessionRecord(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: Map<string, SessionRecord>,
) {
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
  sessions: Map<string, SessionRecord>,
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
  sessions: Map<string, SessionRecord>,
  options: ResolvedHttpServerOptions,
  parsedBody: unknown,
) {
  const session = createSessionRecord(sessions, options)

  try {
    await session.server.connect(session.transport)
    await session.transport.handleRequest(req, res, parsedBody)
  } catch (error) {
    await closeSessionRecord(session)

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
  sessions: Map<string, SessionRecord>,
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
  sessions: Map<string, SessionRecord>,
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
  sessions: Map<string, SessionRecord>,
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

export function createHttpServer(options: HttpServerOptions = {}) {
  const resolved = resolveHttpOptions(options)
  const sessions = new Map<string, SessionRecord>()

  return createNodeServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (url.pathname === resolved.healthPath) {
      if (req.method === 'GET' || req.method === 'HEAD') {
        writeJson(req, res, 200, getHealthPayload(resolved))
        return
      }

      writeJson(req, res, 405, { ok: false, error: 'Method not allowed' })
      return
    }

    if (url.pathname === resolved.mcpPath) {
      await handleMcpRequest(req, res, resolved, sessions)
      return
    }

    writeJson(req, res, 404, { ok: false, error: 'Not found' })
  })
}

export async function startHttpServer(options: HttpServerOptions = {}): Promise<StartedHttpServer> {
  const resolved = resolveHttpOptions(options)
  const sessions = new Map<string, SessionRecord>()
  const server = createNodeServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (url.pathname === resolved.healthPath) {
      if (req.method === 'GET' || req.method === 'HEAD') {
        writeJson(req, res, 200, getHealthPayload(resolved))
        return
      }

      writeJson(req, res, 405, { ok: false, error: 'Method not allowed' })
      return
    }

    if (url.pathname === resolved.mcpPath) {
      await handleMcpRequest(req, res, resolved, sessions)
      return
    }

    writeJson(req, res, 404, { ok: false, error: 'Not found' })
  })

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
    close: async () => {
      await Promise.allSettled([...sessions.values()].map((record) => closeSessionRecord(record)))
      sessions.clear()
      await closeServer(server)
    },
  }
}

export function resolveHttpServerMode(value?: string): ServerMode | undefined {
  return parseServerMode(value)
}

export function resolveHttpEnabledTags(value?: string) {
  return parseEnabledTags(value)
}
