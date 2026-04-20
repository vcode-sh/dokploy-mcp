import { once } from 'node:events'
import {
  createServer as createNodeServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

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
) {
  writeJson(req, res, statusCode, {
    jsonrpc: '2.0',
    error: {
      code: -32603,
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

async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: ResolvedHttpServerOptions,
) {
  if (!(req.method && ['GET', 'POST', 'DELETE'].includes(req.method))) {
    writeJsonRpcError(req, res, 405, 'Method not allowed')
    return
  }

  const server = createServer({
    mode: options.mode,
    enabledTags: options.enabledTags,
  })
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })

  let cleanedUp = false

  const cleanup = async () => {
    if (cleanedUp) {
      return
    }

    cleanedUp = true
    await Promise.allSettled([transport.close(), server.close()])
  }

  res.on('close', () => {
    void cleanup()
  })

  try {
    await server.connect(transport)
    await transport.handleRequest(req, res)
  } catch (error) {
    await cleanup()

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
      await handleMcpRequest(req, res, resolved)
      return
    }

    writeJson(req, res, 404, { ok: false, error: 'Not found' })
  })
}

export async function startHttpServer(options: HttpServerOptions = {}): Promise<StartedHttpServer> {
  const resolved = resolveHttpOptions(options)
  const server = createHttpServer(resolved)

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
    close: () => closeServer(server),
  }
}

export function resolveHttpServerMode(value?: string): ServerMode | undefined {
  return parseServerMode(value)
}

export function resolveHttpEnabledTags(value?: string) {
  return parseEnabledTags(value)
}
