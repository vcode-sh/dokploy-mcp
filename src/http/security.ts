import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  createResolvedConfig,
  resolveConfig,
  resolveTimeout,
  withResolvedConfigOverride,
} from '../config/resolver.js'
import type { ResolvedConfig } from '../config/types.js'
import { writeBadRequest, writeForbidden, writeJson, writeUnauthorized } from './responses.js'
import type { ResolvedHttpServerOptions, SessionRecord } from './types.js'

export const remoteDokployHeaderInputs = [
  {
    name: 'X-Dokploy-Url',
    description:
      'Dokploy panel URL for this request. Accepts the panel URL, /api, or /api/trpc and is normalized automatically.',
    isRequired: true,
    placeholder: 'https://panel.example.com',
  },
  {
    name: 'X-Dokploy-Api-Key',
    description: 'Dokploy API key from Settings > Profile > API/CLI.',
    isRequired: true,
    isSecret: true,
    placeholder: 'dokp_...',
  },
] as const

export const remoteDokployHeaders = {
  url: remoteDokployHeaderInputs[0],
  apiKey: remoteDokployHeaderInputs[1],
} as const

export const mcpCorsAllowMethods = ['GET', 'POST', 'DELETE', 'OPTIONS'] as const
export const mcpCorsAllowHeaders = [
  'Accept',
  'Content-Type',
  'Last-Event-ID',
  'Mcp-Protocol-Version',
  'Mcp-Session-Id',
  remoteDokployHeaders.url.name,
  remoteDokployHeaders.apiKey.name,
] as const
export const mcpCorsExposeHeaders = ['Mcp-Session-Id'] as const

function getHeaderValue(req: IncomingMessage, headerName: string) {
  const value = req.headers[headerName.toLowerCase()]

  if (Array.isArray(value)) {
    const first = value.find((entry) => entry.trim().length > 0)
    return first?.trim()
  }

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin)
}

function setOrAppendVary(res: ServerResponse, value: string) {
  const current = res.getHeader('vary')
  const currentValues = Array.isArray(current)
    ? current.flatMap((entry) => entry.split(','))
    : typeof current === 'string'
      ? current.split(',')
      : []

  const normalized = currentValues.map((entry) => entry.trim()).filter((entry) => entry.length > 0)
  if (!normalized.includes(value)) {
    normalized.push(value)
  }

  res.setHeader('vary', normalized.join(', '))
}

function applyCorsHeaders(res: ServerResponse, origin: string | undefined) {
  setOrAppendVary(res, 'Origin')
  if (!origin) {
    return
  }

  res.setHeader('access-control-allow-origin', origin)
  res.setHeader('access-control-allow-methods', mcpCorsAllowMethods.join(', '))
  res.setHeader('access-control-allow-headers', mcpCorsAllowHeaders.join(', '))
  res.setHeader('access-control-expose-headers', mcpCorsExposeHeaders.join(', '))
}

function validateOrigin(
  req: IncomingMessage,
  res: ServerResponse,
  options: ResolvedHttpServerOptions,
) {
  const origin = getHeaderValue(req, 'origin')
  if (!origin) {
    applyCorsHeaders(res, undefined)
    return true
  }

  if (!isAllowedOrigin(origin, options.allowedOrigins)) {
    writeForbidden(req, res, `Forbidden: Origin ${JSON.stringify(origin)} is not allowed`)
    return false
  }

  applyCorsHeaders(res, origin)
  return true
}

function isValidDokployUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function sameConfigIdentity(left: ResolvedConfig, right: ResolvedConfig) {
  return left.url === right.url && left.apiKey === right.apiKey
}

export function parseAllowedOrigins(value?: string) {
  if (!value) {
    return undefined
  }

  const origins = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return origins.length > 0 ? [...new Set(origins)] : undefined
}

function resolveRequestConfig(
  req: IncomingMessage,
  res: ServerResponse,
  options: ResolvedHttpServerOptions,
) {
  const remoteUrl = getHeaderValue(req, remoteDokployHeaders.url.name)
  const remoteApiKey = getHeaderValue(req, remoteDokployHeaders.apiKey.name)
  const hasRemoteUrl = remoteUrl !== undefined
  const hasRemoteApiKey = remoteApiKey !== undefined

  if (hasRemoteUrl !== hasRemoteApiKey) {
    writeBadRequest(
      req,
      res,
      `Bad Request: ${remoteDokployHeaders.url.name} and ${remoteDokployHeaders.apiKey.name} must be provided together`,
    )
    return null
  }

  if (remoteUrl && remoteApiKey) {
    if (!isValidDokployUrl(remoteUrl)) {
      writeBadRequest(
        req,
        res,
        `Bad Request: ${remoteDokployHeaders.url.name} must be a valid http or https URL`,
      )
      return null
    }

    return createResolvedConfig(
      remoteUrl,
      remoteApiKey,
      'http-headers',
      resolveTimeout(process.env.DOKPLOY_TIMEOUT),
    )
  }

  if (options.allowConfigFallback) {
    const fallback = resolveConfig({ includeOverride: false })
    if (fallback) {
      return fallback
    }
  }

  const guidance = options.allowConfigFallback
    ? `Provide ${remoteDokployHeaders.url.name} and ${remoteDokployHeaders.apiKey.name}, or configure local Dokploy credentials before starting the HTTP server.`
    : `Provide ${remoteDokployHeaders.url.name} and ${remoteDokployHeaders.apiKey.name}.`

  writeUnauthorized(req, res, `Unauthorized: ${guidance}`)
  return null
}

export function handleMcpPreflight(
  req: IncomingMessage,
  res: ServerResponse,
  options: ResolvedHttpServerOptions,
) {
  if (req.method !== 'OPTIONS') {
    return false
  }

  const origin = getHeaderValue(req, 'origin')
  if (!origin) {
    writeJson(req, res, 400, {
      ok: false,
      error: 'Origin header is required for preflight requests',
    })
    return true
  }

  if (!isAllowedOrigin(origin, options.allowedOrigins)) {
    writeJson(req, res, 403, { ok: false, error: 'Origin not allowed' })
    return true
  }

  applyCorsHeaders(res, origin)
  res.statusCode = 204
  res.end()
  return true
}

export function authorizeMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: ResolvedHttpServerOptions,
  session?: SessionRecord,
) {
  if (!validateOrigin(req, res, options)) {
    return null
  }

  const config = resolveRequestConfig(req, res, options)
  if (!config) {
    return null
  }

  if (session && !sameConfigIdentity(config, session.resolvedConfig)) {
    writeForbidden(
      req,
      res,
      'Forbidden: request credentials do not match the credentials bound to this MCP session',
    )
    return null
  }

  return session?.resolvedConfig ?? config
}

export function withHttpRequestConfig<T>(config: ResolvedConfig, callback: () => T): T {
  return withResolvedConfigOverride(config, callback)
}
