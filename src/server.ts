import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createCodeModeServer } from './codemode/server-codemode.js'
import { createHybridModeServer, createRawModeServer } from './rawmode/server-rawmode.js'

export const serverModes = ['codemode', 'raw', 'hybrid'] as const

export type ServerMode = (typeof serverModes)[number]

export interface CreateServerOptions {
  mode?: ServerMode
  enabledTags?: string[]
}

function isServerMode(value: string): value is ServerMode {
  return serverModes.includes(value as ServerMode)
}

function normalizeEnabledTags(enabledTags?: string[]) {
  const normalized = enabledTags
    ?.map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)

  if (!normalized || normalized.length === 0) {
    return undefined
  }

  return [...new Set(normalized)]
}

export function parseServerMode(value?: string): ServerMode | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  return isServerMode(normalized) ? normalized : undefined
}

export function parseEnabledTags(value?: string): string[] | undefined {
  if (!value) {
    return undefined
  }

  return normalizeEnabledTags(value.split(','))
}

export function resolveServerOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CreateServerOptions {
  return {
    mode: parseServerMode(env.DOKPLOY_MCP_MODE),
    enabledTags: parseEnabledTags(env.DOKPLOY_ENABLED_TAGS),
  }
}

export function createServer(options: CreateServerOptions = {}): McpServer {
  const mode = options.mode ?? 'codemode'
  const enabledTags = normalizeEnabledTags(options.enabledTags)

  switch (mode) {
    case 'raw':
      return createRawModeServer({ enabledTags })
    case 'hybrid':
      return createHybridModeServer({ enabledTags })
    default:
      return createCodeModeServer()
  }
}
