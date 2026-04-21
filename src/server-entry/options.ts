import {
  parseCapabilityFlags,
  parseEnabledTags,
  parseServerMode,
  type ServerCapabilityFlags,
  type ServerMode,
} from '../server.js'

export type ServerTransportMode = 'stdio' | 'http'

export interface StartServerOptions {
  mode?: ServerMode
  enabledTags?: string[]
  capabilityFlags?: ServerCapabilityFlags
  transport: ServerTransportMode
  host?: string
  port?: number
  mcpPath?: string
  healthPath?: string
  allowedOrigins?: string[]
  allowConfigFallback?: boolean
}

export function parseFlagValue(argumentsList: string[], flag: string) {
  const index = argumentsList.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  return argumentsList[index + 1]
}

export function parseNumberFlag(value?: string) {
  if (!value) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function parseBooleanFlagValue(value?: string) {
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

export function parseCsvFlag(value?: string) {
  if (!value) {
    return undefined
  }

  const items = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return items.length > 0 ? [...new Set(items)] : undefined
}

export function parseBooleanCommandFlag(argumentsList: string[], flag: string) {
  const index = argumentsList.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  const next = argumentsList[index + 1]
  if (!next || next.startsWith('--')) {
    return true
  }

  return parseBooleanFlagValue(next) ?? true
}

export function resolveTransportFromEnv(env: NodeJS.ProcessEnv = process.env): ServerTransportMode {
  return env.DOKPLOY_MCP_TRANSPORT === 'http' ? 'http' : 'stdio'
}

export function isServerCommand(command: string | undefined) {
  return command === 'serve' || command === 'serve-http' || command === 'serve-stdio'
}

export function resolveServerOptions(
  argumentsList: string[],
  env: NodeJS.ProcessEnv = process.env,
): StartServerOptions | null {
  if (argumentsList.length === 0) {
    const options: StartServerOptions = {
      transport: resolveTransportFromEnv(env),
      mode: parseServerMode(env.DOKPLOY_MCP_MODE),
      enabledTags: parseEnabledTags(env.DOKPLOY_ENABLED_TAGS),
      host: env.DOKPLOY_MCP_HTTP_HOST,
      port: parseNumberFlag(env.DOKPLOY_MCP_HTTP_PORT),
      mcpPath: env.DOKPLOY_MCP_HTTP_PATH,
      healthPath: env.DOKPLOY_MCP_HEALTH_PATH,
      allowedOrigins: parseCsvFlag(env.DOKPLOY_MCP_ALLOWED_ORIGINS),
      allowConfigFallback: parseBooleanFlagValue(env.DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK),
    }

    const capabilityFlags = parseCapabilityFlags(env.DOKPLOY_MCP_CAPABILITIES)
    if (capabilityFlags) {
      options.capabilityFlags = capabilityFlags
    }

    return options
  }

  if (!isServerCommand(argumentsList[0])) {
    return null
  }

  const command = argumentsList[0]
  const transport =
    command === 'serve-http'
      ? 'http'
      : command === 'serve-stdio'
        ? 'stdio'
        : parseFlagValue(argumentsList, '--transport') === 'http'
          ? 'http'
          : resolveTransportFromEnv(env)

  const options: StartServerOptions = {
    transport,
    mode: parseServerMode(parseFlagValue(argumentsList, '--mode')),
    enabledTags: parseEnabledTags(parseFlagValue(argumentsList, '--enabled-tags')),
    host: parseFlagValue(argumentsList, '--host'),
    port: parseNumberFlag(parseFlagValue(argumentsList, '--port')),
    mcpPath: parseFlagValue(argumentsList, '--mcp-path'),
    healthPath: parseFlagValue(argumentsList, '--health-path'),
    allowedOrigins: parseCsvFlag(parseFlagValue(argumentsList, '--allowed-origins')),
    allowConfigFallback: parseBooleanCommandFlag(argumentsList, '--allow-config-fallback'),
  }

  const capabilityFlags = parseCapabilityFlags(parseFlagValue(argumentsList, '--capabilities'))
  if (capabilityFlags) {
    options.capabilityFlags = capabilityFlags
  }

  return options
}
