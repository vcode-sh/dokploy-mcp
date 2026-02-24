import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { ConfigFile, DokployConfig, ResolvedConfig } from './types.js'
import { getConfigDir, getConfigFilePath } from './types.js'

/**
 * Resolves Dokploy configuration from multiple sources in priority order:
 * 1. Environment variables (DOKPLOY_URL + DOKPLOY_API_KEY)
 * 2. Config file (~/.config/dokploy-mcp/config.json)
 * 3. Dokploy CLI config (@dokploy/cli global install)
 *
 * Returns null if no configuration is found.
 */
export function resolveConfig(): ResolvedConfig | null {
  const timeout = Number.parseInt(process.env.DOKPLOY_TIMEOUT || '30000', 10)

  // 1. Environment variables (highest priority)
  const envUrl = process.env.DOKPLOY_URL
  const envApiKey = process.env.DOKPLOY_API_KEY

  if (envUrl && envApiKey) {
    return {
      url: envUrl,
      apiKey: envApiKey,
      source: 'env',
      timeout,
    }
  }

  // 2. Config file
  const configFromFile = readConfigFile()
  if (configFromFile) {
    return {
      url: configFromFile.url,
      apiKey: configFromFile.apiKey,
      source: 'config-file',
      timeout,
    }
  }

  // 3. Dokploy CLI config
  const configFromCli = readDokployCliConfig()
  if (configFromCli) {
    return {
      url: configFromCli.url,
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
 * The CLI stores { url, token } where url is the panel URL (not the API URL).
 * Converts: appends /api to the URL and maps token to apiKey.
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

    // The CLI stores the panel URL; append /api if not already present
    let url = record.url.replace(/\/+$/, '')
    if (!url.endsWith('/api')) {
      url = `${url}/api`
    }

    return { url, apiKey: record.token }
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
 * Validates Dokploy credentials by making API requests.
 * Tries to detect the correct URL format and validates the API key.
 */
export async function validateCredentials(url: string, apiKey: string): Promise<ValidationResult> {
  const normalizedUrl = url.replace(/\/+$/, '')
  const hasApiSuffix = normalizedUrl.endsWith('/api')

  // Build list of base URLs to try
  const baseUrls: string[] = hasApiSuffix
    ? [normalizedUrl]
    : [`${normalizedUrl}/api`, normalizedUrl]

  for (const baseUrl of baseUrls) {
    const result = await tryValidate(baseUrl, apiKey)
    if (result.valid) {
      return result
    }
    // If we got an auth error (not a network/404 error), don't try the next URL
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

function parseUser(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const record = data as Record<string, unknown>
  if (typeof record.email === 'string') return record.email
  if (typeof record.name === 'string') return record.name
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
    if (typeof data === 'string') return data
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>
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
    const authResponse = await fetch(`${baseUrl}/auth.get`, {
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
