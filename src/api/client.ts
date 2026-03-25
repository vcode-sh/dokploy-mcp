import { buildTrpcPostBody, buildTrpcQueryString } from '../codemode/gateway/request-normalizer.js'
import { resolveConfig } from '../config/resolver.js'

const DEFAULT_TIMEOUT = 30_000

interface ClientConfig {
  baseUrl: string
  apiKey: string
  timeout: number
}

function getErrorMessage(body: unknown, statusText: string): string {
  if (typeof body !== 'object' || body === null) {
    return statusText
  }

  if ('message' in body && typeof body.message === 'string') {
    return body.message
  }

  if ('error' in body && typeof body.error === 'object' && body.error !== null) {
    const error = body.error as Record<string, unknown>
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }

    if ('json' in error && typeof error.json === 'object' && error.json !== null) {
      const json = error.json as Record<string, unknown>
      if ('message' in json && typeof json.message === 'string') {
        return json.message
      }
    }
  }

  return statusText
}

export function unwrapTrpcResponse(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data

  const outer = data as Record<string, unknown>
  if (typeof outer.result !== 'object' || outer.result === null) return data

  const result = outer.result as Record<string, unknown>
  if (typeof result.data !== 'object' || result.data === null) return data

  const inner = result.data as Record<string, unknown>
  return 'json' in inner ? inner.json : data
}

function getConfig(): ClientConfig {
  const resolved = resolveConfig()

  if (!resolved) {
    throw new Error(
      [
        'Dokploy MCP is not configured. Set up credentials using one of these methods:',
        '',
        '  1. Run: npx @vibetools/dokploy-mcp setup',
        '  2. Set environment variables: DOKPLOY_URL and DOKPLOY_API_KEY',
        '',
        'Get your API key from Dokploy Settings > API.',
      ].join('\n'),
    )
  }

  return {
    baseUrl: resolved.url.replace(/\/+$/, ''),
    apiKey: resolved.apiKey,
    timeout: resolved.timeout || DEFAULT_TIMEOUT,
  }
}

let _config: ClientConfig | null = null
function config(): ClientConfig {
  _config ??= getConfig()
  return _config
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
    public readonly endpoint: string,
  ) {
    const msg = getErrorMessage(body, statusText)
    super(`Dokploy API error (${status}): ${msg}`)
    this.name = 'ApiError'
  }
}

export const buildQueryString = buildTrpcQueryString

/**
 * Checks whether an error was caused by an aborted fetch.
 * Both checks are needed: older Node versions throw DOMException,
 * while newer versions throw an Error with name 'AbortError'.
 */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException || (error instanceof Error && error.name === 'AbortError')
}

async function request<T = unknown>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const { baseUrl, apiKey, timeout } = config()

  const qs = method === 'GET' ? buildQueryString(body) : ''
  const url = qs ? `${baseUrl}${path}?${qs}` : `${baseUrl}${path}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
      body: method === 'POST' ? buildTrpcPostBody(body) : undefined,
      signal: controller.signal,
    })

    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, data, path)
    }

    return unwrapTrpcResponse(data) as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (isAbortError(error)) {
      throw new Error(`Request to ${path} timed out after ${timeout}ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get: <T = unknown>(path: string, params?: Record<string, unknown>) =>
    request<T>('GET', path, params),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
}
