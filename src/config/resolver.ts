import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { ConfigFile, DokployConfig, ResolvedConfig } from './types.js'
import { getConfigDir, getConfigFilePath } from './types.js'

/**
 * Normalizes a Dokploy URL to the tRPC API base.
 * Accepts any of these formats:
 *   https://panel.example.com
 *   https://panel.example.com/api
 *   https://panel.example.com/api/trpc
 * Always returns https://panel.example.com/api/trpc
 */
export function normalizeUrl(url: string): string {
  const stripped = url.replace(/\/+$/, '')
  if (stripped.endsWith('/api/trpc')) return stripped
  if (stripped.endsWith('/api')) return `${stripped}/trpc`
  return `${stripped}/api/trpc`
}

/**
 * Resolves Dokploy configuration from multiple sources in priority order:
 * 1. Environment variables (DOKPLOY_URL + DOKPLOY_API_KEY)
 * 2. Config file (~/.config/dokploy-mcp/config.json)
 * 3. Dokploy CLI config (@dokploy/cli global install)
 *
 * URLs are automatically normalized to the tRPC API base path.
 * Returns null if no configuration is found.
 */
export function resolveConfig(): ResolvedConfig | null {
  const timeout = Number.parseInt(process.env.DOKPLOY_TIMEOUT || '30000', 10)

  // 1. Environment variables (highest priority)
  const envUrl = process.env.DOKPLOY_URL
  const envApiKey = process.env.DOKPLOY_API_KEY

  if (envUrl && envApiKey) {
    return {
      url: normalizeUrl(envUrl),
      apiKey: envApiKey,
      source: 'env',
      timeout,
    }
  }

  // 2. Config file
  const configFromFile = readConfigFile()
  if (configFromFile) {
    return {
      url: normalizeUrl(configFromFile.url),
      apiKey: configFromFile.apiKey,
      source: 'config-file',
      timeout,
    }
  }

  // 3. Dokploy CLI config
  const configFromCli = readDokployCliConfig()
  if (configFromCli) {
    return {
      url: normalizeUrl(configFromCli.url),
      apiKey: configFromCli.apiKey,
      source: 'dokploy-cli',
      timeout,
    }
  }

  return null
}

/**
 * Reads the config file at the platform-appropriate location.
 * Returns null if the file doesn't exist or is invalid.
 */
function readConfigFile(): ConfigFile | null {
  const filePath = getConfigFilePath()

  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf8')
    const parsed: unknown = JSON.parse(content)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('url' in parsed) ||
      !('apiKey' in parsed)
    ) {
      return null
    }

    const record = parsed as Record<string, unknown>
    if (typeof record.url !== 'string' || typeof record.apiKey !== 'string') {
      return null
    }

    if (!(record.url && record.apiKey)) {
      return null
    }

    return { url: record.url, apiKey: record.apiKey }
  } catch {
    return null
  }
}

/**
 * Reads the Dokploy CLI global config.
 * The CLI stores { url, token } where url is the bare panel URL.
 * Maps token to apiKey; URL normalization is handled by resolveConfig().
 */
function readDokployCliConfig(): DokployConfig | null {
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
    const cliConfigPath = join(globalRoot, '@dokploy', 'cli', 'config.json')

    if (!existsSync(cliConfigPath)) {
      return null
    }

    const content = readFileSync(cliConfigPath, 'utf8')
    const parsed: unknown = JSON.parse(content)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('url' in parsed) ||
      !('token' in parsed)
    ) {
      return null
    }

    const record = parsed as Record<string, unknown>
    if (typeof record.url !== 'string' || typeof record.token !== 'string') {
      return null
    }

    if (!(record.url && record.token)) {
      return null
    }

    return { url: record.url, apiKey: record.token }
  } catch {
    return null
  }
}

/**
 * Saves configuration to the config file.
 * Creates the config directory if it doesn't exist.
 * Returns the file path where the config was saved.
 */
export function saveConfig(config: DokployConfig): string {
  const configDir = getConfigDir()
  const filePath = getConfigFilePath()

  mkdirSync(configDir, { recursive: true })

  const data: ConfigFile = {
    url: config.url,
    apiKey: config.apiKey,
  }

  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

  return filePath
}

export interface ValidationResult {
  valid: boolean
  resolvedUrl?: string
  user?: string
  version?: string
  error?: string
}

/**
 * Builds a list of candidate base URLs to try for validation.
 * Handles bare panel URLs, /api, and /api/trpc suffixes.
 */
function buildCandidateUrls(url: string): string[] {
  const normalized = url.replace(/\/+$/, '')

  if (normalized.endsWith('/api/trpc')) {
    return [normalized]
  }
  if (normalized.endsWith('/api')) {
    // User may have meant /api/trpc — try both
    return [`${normalized}/trpc`, normalized]
  }
  // Bare panel URL — try the most common path first
  return [`${normalized}/api/trpc`, `${normalized}/api`, normalized]
}

/**
 * Validates Dokploy credentials by making API requests.
 * Tries to detect the correct URL format and validates the API key.
 */
export async function validateCredentials(url: string, apiKey: string): Promise<ValidationResult> {
  const normalizedUrl = url.replace(/\/+$/, '')
  const candidates = buildCandidateUrls(normalizedUrl)

  for (const baseUrl of candidates) {
    const result = await tryValidate(baseUrl, apiKey)
    if (result.valid) {
      return result
    }
    // Auth error means the URL was right but the key was wrong — stop trying
    if (
      result.error &&
      !result.error.includes('not reachable') &&
      !result.error.includes('Not Found')
    ) {
      return result
    }
  }

  return {
    valid: false,
    error: `Could not connect to Dokploy at ${normalizedUrl}. Ensure the URL is correct and the server is running.`,
  }
}

function apiHeaders(apiKey: string): Record<string, string> {
  return { Accept: 'application/json', 'x-api-key': apiKey }
}

function mapAuthError(status: number, statusText: string): ValidationResult {
  if (status === 401 || status === 403) {
    return { valid: false, error: 'Invalid API key. Check your key in Dokploy Settings > API.' }
  }
  if (status === 404) {
    return { valid: false, error: 'Not Found' }
  }
  return { valid: false, error: `API returned HTTP ${status}: ${statusText}` }
}

/**
 * Unwraps a tRPC response envelope: { result: { data: { json: T } } } → T
 * Falls back to the raw data if it's not in tRPC format.
 */
function unwrapTrpc(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data
  const outer = data as Record<string, unknown>
  if (typeof outer.result !== 'object' || outer.result === null) return data
  const result = outer.result as Record<string, unknown>
  if (typeof result.data !== 'object' || result.data === null) return data
  const inner = result.data as Record<string, unknown>
  return 'json' in inner ? inner.json : data
}

function parseUser(data: unknown): string | undefined {
  const unwrapped = unwrapTrpc(data)
  if (typeof unwrapped !== 'object' || unwrapped === null) return undefined
  const record = unwrapped as Record<string, unknown>
  // Top-level email/name
  if (typeof record.email === 'string') return record.email
  // Nested user object (tRPC user.get response)
  if (typeof record.user === 'object' && record.user !== null) {
    const user = record.user as Record<string, unknown>
    if (typeof user.email === 'string') return user.email
    if (typeof user.firstName === 'string') return user.firstName
  }
  return undefined
}

async function fetchVersion(baseUrl: string, apiKey: string): Promise<string | undefined> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)

  try {
    const response = await fetch(`${baseUrl}/settings.getDokployVersion`, {
      method: 'GET',
      headers: apiHeaders(apiKey),
      signal: controller.signal,
    })

    if (!response.ok) return undefined

    const data: unknown = await response.json()
    const unwrapped = unwrapTrpc(data)
    if (typeof unwrapped === 'string') return unwrapped
    if (typeof unwrapped === 'object' && unwrapped !== null) {
      const record = unwrapped as Record<string, unknown>
      if (typeof record.version === 'string') return record.version
    }
    return undefined
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

async function tryValidate(baseUrl: string, apiKey: string): Promise<ValidationResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)

  try {
    // Use user.get — the standard Dokploy tRPC endpoint for current user
    const authResponse = await fetch(`${baseUrl}/user.get`, {
      method: 'GET',
      headers: apiHeaders(apiKey),
      signal: controller.signal,
    })

    if (!authResponse.ok) {
      return mapAuthError(authResponse.status, authResponse.statusText)
    }

    const authData: unknown = await authResponse.json()
    const user = parseUser(authData)
    const version = await fetchVersion(baseUrl, apiKey)

    return { valid: true, resolvedUrl: baseUrl, user, version }
  } catch (error) {
    if (error instanceof DOMException || (error instanceof Error && error.name === 'AbortError')) {
      return { valid: false, error: `Server at ${baseUrl} is not reachable (request timed out).` }
    }
    return {
      valid: false,
      error: `Server at ${baseUrl} is not reachable: ${error instanceof Error ? error.message : String(error)}`,
    }
  } finally {
    clearTimeout(timer)
  }
}
