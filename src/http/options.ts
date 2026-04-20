import type { HttpServerOptions, ResolvedHttpServerOptions } from './types.js'

const DEFAULT_HTTP_HOST = '127.0.0.1'
const DEFAULT_HTTP_PORT = 3000
const DEFAULT_MCP_PATH = '/mcp'
const DEFAULT_HEALTH_PATH = '/health'

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

export function resolveHttpOptions(options: HttpServerOptions = {}): ResolvedHttpServerOptions {
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

export function getHealthPayload(options: ResolvedHttpServerOptions) {
  return {
    ok: true,
    transport: 'http',
    mode: options.mode,
    enabledTags: options.enabledTags ?? [],
    mcpPath: options.mcpPath,
    healthPath: options.healthPath,
  }
}
