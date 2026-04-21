import type { IncomingMessage, Server, ServerResponse } from 'node:http'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import type { ResolvedConfig } from '../config/types.js'
import type { CreateServerOptions, ServerMode } from '../server.js'

export interface HttpServerOptions extends CreateServerOptions {
  host?: string
  port?: number
  mcpPath?: string
  healthPath?: string
  allowedOrigins?: string[]
  allowConfigFallback?: boolean
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
  capabilityFlags?: CreateServerOptions['capabilityFlags']
  host: string
  port: number
  mcpPath: string
  healthPath: string
  allowedOrigins: string[]
  allowConfigFallback: boolean
  remoteHeaders: readonly HttpRemoteHeaderInput[]
}

export interface HttpRemoteHeaderInput {
  name: string
  description: string
  isRequired?: boolean
  isSecret?: boolean
  placeholder?: string
}

export interface SessionRecord {
  server: McpServer
  transport: StreamableHTTPServerTransport
  resolvedConfig: ResolvedConfig
}

export interface SessionRegistry {
  get: (sessionId: string) => SessionRecord | undefined
  trackRecord: (record: SessionRecord) => void
  set: (sessionId: string, record: SessionRecord) => void
  delete: (sessionId: string) => void
  isShuttingDown: () => boolean
  beginShutdown: () => void
  beginRequest: (record: SessionRecord, kind: 'request' | 'stream' | 'control') => boolean
  endRequest: (record: SessionRecord, kind: 'request' | 'stream' | 'control') => Promise<void>
  registerRequestAborter: (record: SessionRecord, aborter: () => void) => void
  unregisterRequestAborter: (record: SessionRecord, aborter: () => void) => void
  closeRecord: (record: SessionRecord) => Promise<void>
  closeSession: (sessionId: string) => Promise<void>
  closeAll: () => Promise<void>
}

export type HttpRequestHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>
