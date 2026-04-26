import { AsyncLocalStorage } from 'node:async_hooks'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { z } from 'zod'

import type {
  ConfigFile,
  ConfigSource,
  DokployConfig,
  ListedProfile,
  ResolvedConfig,
} from './types.js'
import { getConfigDir, getConfigFilePath } from './types.js'

const configFileSchema = z.object({
  url: z.string().min(1),
  apiKey: z.string().min(1),
})

const profilesJsonSchema = z.record(
  z.string().min(1),
  z.object({
    url: z.string().min(1),
    apiKey: z.string().min(1),
  }),
)

const dokployCliSchema = z.object({
  url: z.string().min(1),
  token: z.string().min(1),
})

const userSchema = z
  .object({
    email: z.string().optional(),
    user: z
      .object({
        email: z.string().optional(),
        firstName: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

const versionSchema = z.union([z.string(), z.object({ version: z.string() }).passthrough()])
const defaultTimeoutMs = 30_000
const configOverrideStorage = new AsyncLocalStorage<ResolvedConfig | null>()

export function resolveTimeout(rawTimeout: string | undefined): number {
  if (!rawTimeout) {
    return defaultTimeoutMs
  }

  const parsed = Number.parseInt(rawTimeout, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultTimeoutMs
}

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

export function createResolvedConfig(
  url: string,
  apiKey: string,
  source: ConfigSource,
  timeout: number,
  profile?: string,
): ResolvedConfig {
  return {
    url: normalizeUrl(url),
    apiKey,
    source,
    timeout,
    ...(profile ? { profile } : {}),
  }
}

export function withResolvedConfigOverride<T>(config: ResolvedConfig | null, callback: () => T): T {
  return configOverrideStorage.run(config, callback)
}

export function getResolvedConfigOverride() {
  return configOverrideStorage.getStore() ?? null
}

function readProfilesJson(): Record<string, DokployConfig> | null {
  const rawProfiles = process.env.DOKPLOY_PROFILES_JSON
  if (!rawProfiles) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(rawProfiles)
    const result = profilesJsonSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function buildAvailableProfiles(timeout: number): ResolvedConfig[] {
  const profilesJson = readProfilesJson()
  if (!profilesJson) {
    return []
  }

  return Object.entries(profilesJson)
    .map(([name, profile]) => ({
      name: name.trim(),
      profile,
    }))
    .filter(({ name }) => name.length > 0)
    .map(({ name, profile }) =>
      createResolvedConfig(profile.url, profile.apiKey, 'profiles-json', timeout, name),
    )
}

function formatProfileNames(profiles: Pick<ResolvedConfig, 'profile'>[]) {
  return profiles
    .map((profile) => profile.profile)
    .filter((name): name is string => Boolean(name))
    .sort((left, right) => left.localeCompare(right))
    .join(', ')
}

export function listProfiles(): ListedProfile[] {
  const timeout = resolveTimeout(process.env.DOKPLOY_TIMEOUT)
  const jsonProfiles = buildAvailableProfiles(timeout)

  if (jsonProfiles.length > 0) {
    return jsonProfiles
      .map((profile) => ({
        name: profile.profile ?? '',
        url: profile.url,
        source: profile.source,
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  const legacy = resolveConfig()
  if (!legacy) {
    return []
  }

  return [
    {
      name: 'default',
      url: legacy.url,
      source: legacy.source,
    },
  ]
}

export function resolveProfileConfig(profile?: string): ResolvedConfig | null {
  const timeout = resolveTimeout(process.env.DOKPLOY_TIMEOUT)
  const normalizedProfile = profile?.trim()
  const jsonProfiles = buildAvailableProfiles(timeout)

  if (jsonProfiles.length === 0) {
    const legacy = resolveConfig()
    if (!normalizedProfile) {
      return legacy
    }

    if (legacy && normalizedProfile === 'default') {
      return legacy
    }

    const available = legacy ? 'default' : 'none'
    throw new Error(
      `Unknown Dokploy profile "${normalizedProfile}". Available profiles: ${available}.`,
    )
  }

  if (normalizedProfile) {
    const match = jsonProfiles.find((entry) => entry.profile === normalizedProfile)
    if (match) {
      return match
    }

    throw new Error(
      `Unknown Dokploy profile "${normalizedProfile}". Available profiles: ${formatProfileNames(
        jsonProfiles,
      )}.`,
    )
  }

  if (jsonProfiles.length === 1) {
    return jsonProfiles[0] ?? null
  }

  throw new Error(
    `Dokploy profile is required when multiple profiles are configured. Available profiles: ${formatProfileNames(
      jsonProfiles,
    )}.`,
  )
}

export interface ResolveConfigOptions {
  includeOverride?: boolean
}

/**
 * Resolves Dokploy configuration from multiple sources in priority order:
 * 1. Environment variables (DOKPLOY_URL + DOKPLOY_API_KEY)
 * 2. DOKPLOY_PROFILES_JSON when it contains exactly one profile
 * 3. Config file (~/.config/dokploy-mcp/config.json)
 * 4. Dokploy CLI config (@dokploy/cli global install)
 *
 * URLs are automatically normalized to the tRPC API base path.
 * Returns null if no configuration is found.
 */
export function resolveConfig(options: ResolveConfigOptions = {}): ResolvedConfig | null {
  const timeout = resolveTimeout(process.env.DOKPLOY_TIMEOUT)

  if (options.includeOverride !== false) {
    const override = getResolvedConfigOverride()
    if (override) {
      return override
    }
  }

  // 1. Environment variables (highest priority)
  const envUrl = process.env.DOKPLOY_URL
  const envApiKey = process.env.DOKPLOY_API_KEY

  if (envUrl && envApiKey) {
    return createResolvedConfig(envUrl, envApiKey, 'env', timeout)
  }

  // 2. Single profile JSON config
  const jsonProfiles = buildAvailableProfiles(timeout)
  if (jsonProfiles.length === 1) {
    return jsonProfiles[0] ?? null
  }

  // 3. Config file
  const configFromFile = readConfigFile()
  if (configFromFile) {
    return createResolvedConfig(configFromFile.url, configFromFile.apiKey, 'config-file', timeout)
  }

  // 4. Dokploy CLI config
  const configFromCli = readDokployCliConfig()
  if (configFromCli) {
    return createResolvedConfig(configFromCli.url, configFromCli.apiKey, 'dokploy-cli', timeout)
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
    const result = configFileSchema.safeParse(parsed)
    return result.success ? result.data : null
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
    const result = dokployCliSchema.safeParse(parsed)
    return result.success ? { url: result.data.url, apiKey: result.data.token } : null
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
    return {
      valid: false,
      error: 'Invalid API key. Check your key in Dokploy Settings > Profile > API/CLI.',
    }
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
  const result = userSchema.safeParse(unwrapped)
  if (!result.success) return undefined
  const { email, user } = result.data
  return email ?? user?.email ?? user?.firstName
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
    const result = versionSchema.safeParse(unwrapped)
    if (!result.success) return undefined
    return typeof result.data === 'string' ? result.data : result.data.version
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
