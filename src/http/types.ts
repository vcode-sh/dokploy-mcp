import type { IncomingMessage, Server, ServerResponse } from 'node:http'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import type { CreateServerOptions, ServerMode } from '../server.js'

export interface HttpServerOptions extends CreateServerOptions {
  host?: string
  port?: number
  mcpPath?: string
  healthPath?: string
}

export interface StartedHttpServer {
  server: Server
  url: string
  mcpUrl: string
  healthUrl: string
  close: () => Promise<void>
}

export interface ResolvedHttpServerOptions {
  mode: ServerMode
  enabledTags?: string[]
  host: string
  port: number
  mcpPath: string
  healthPath: string
}

export interface SessionRecord {
  server: McpServer
  transport: StreamableHTTPServerTransport
}

export interface SessionRegistry {
  get: (sessionId: string) => SessionRecord | undefined
  set: (sessionId: string, record: SessionRecord) => void
  delete: (sessionId: string) => void
  closeSession: (sessionId: string) => Promise<void>
  closeAll: () => Promise<void>
}

export type HttpRequestHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>
