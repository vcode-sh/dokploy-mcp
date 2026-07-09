import { parseCapabilityFlags, serverCapabilityFlags } from '../server.js'
import { parseAllowedOrigins, remoteDokployHeaderInputs } from './security.js'
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

function parseBoolean(value?: string) {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }

  return undefined
}

function normalizePath(pathname: string | undefined, fallback: string) {
  if (!pathname) {
    return fallback
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

export function resolveHttpOptions(options: HttpServerOptions = {}): ResolvedHttpServerOptions {
  const allowedOrigins =
    options.allowedOrigins ?? parseAllowedOrigins(process.env.DOKPLOY_MCP_ALLOWED_ORIGINS) ?? []

  if (allowedOrigins.includes('*')) {
    console.error(
      'dokploy-mcp: DOKPLOY_MCP_ALLOWED_ORIGINS=* reflects any Origin. Use an explicit allowlist for hosted deployments.',
    )
  }

  return {
    mode: options.mode ?? 'codemode',
    enabledTags: options.enabledTags,
    capabilityFlags:
      options.capabilityFlags ?? parseCapabilityFlags(process.env.DOKPLOY_MCP_CAPABILITIES),
    host: options.host ?? process.env.DOKPLOY_MCP_HTTP_HOST ?? DEFAULT_HTTP_HOST,
    port: options.port ?? parsePort(process.env.DOKPLOY_MCP_HTTP_PORT) ?? DEFAULT_HTTP_PORT,
    mcpPath: normalizePath(options.mcpPath ?? process.env.DOKPLOY_MCP_HTTP_PATH, DEFAULT_MCP_PATH),
    healthPath: normalizePath(
      options.healthPath ?? process.env.DOKPLOY_MCP_HEALTH_PATH,
      DEFAULT_HEALTH_PATH,
    ),
    allowedOrigins,
    allowConfigFallback:
      options.allowConfigFallback ??
      parseBoolean(process.env.DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK) ??
      false,
    remoteHeaders: remoteDokployHeaderInputs,
  }
}

export function getHealthPayload(options: ResolvedHttpServerOptions) {
  return {
    ok: true,
    transport: 'http',
    mode: options.mode,
    enabledTags: options.enabledTags ?? [],
    capabilityFlags: Object.keys(options.capabilityFlags ?? {})
      .filter((flag) =>
        serverCapabilityFlags.includes(flag as (typeof serverCapabilityFlags)[number]),
      )
      .sort(),
    mcpPath: options.mcpPath,
    healthPath: options.healthPath,
    remoteAuth: {
      allowConfigFallback: options.allowConfigFallback,
      allowedOrigins: options.allowedOrigins,
      headers: options.remoteHeaders.map((header) => ({
        name: header.name,
        isRequired: header.isRequired ?? false,
        isSecret: header.isSecret ?? false,
      })),
    },
  }
}
