import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createCodeModeServer } from './codemode/server-codemode.js'
import {
  MCP_STAGED_CAPABILITY_FAMILIES,
  type McpCapabilityFlags,
} from './mcp/registration/types.js'
import { createHybridModeServer, createRawModeServer } from './rawmode/server-rawmode.js'

export const serverModes = ['codemode', 'raw', 'hybrid'] as const
export const serverCapabilityFlags = MCP_STAGED_CAPABILITY_FAMILIES

export type ServerMode = (typeof serverModes)[number]
export type ServerCapabilityFlag = (typeof serverCapabilityFlags)[number]
export type ServerCapabilityFlags = McpCapabilityFlags

export interface CreateServerOptions {
  mode?: ServerMode
  enabledTags?: string[]
  capabilityFlags?: ServerCapabilityFlags
}

function isServerMode(value: string): value is ServerMode {
  return serverModes.includes(value as ServerMode)
}

function isServerCapabilityFlag(value: string): value is ServerCapabilityFlag {
  return serverCapabilityFlags.includes(value as ServerCapabilityFlag)
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

function normalizeCapabilityFlags(
  capabilityFlags?: ServerCapabilityFlags | string[],
): ServerCapabilityFlags | undefined {
  if (!capabilityFlags) {
    return undefined
  }

  const enabledFlags = Array.isArray(capabilityFlags)
    ? capabilityFlags
    : Object.entries(capabilityFlags)
        .filter(([, enabled]) => enabled)
        .map(([flag]) => flag)

  const normalized = enabledFlags
    .map((flag) => flag.trim().toLowerCase())
    .filter((flag) => isServerCapabilityFlag(flag))

  if (normalized.length === 0) {
    return undefined
  }

  return Object.fromEntries([...new Set(normalized)].map((flag) => [flag, true]))
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

export function parseCapabilityFlags(value?: string): ServerCapabilityFlags | undefined {
  if (!value) {
    return undefined
  }

  return normalizeCapabilityFlags(value.split(','))
}

export function resolveServerOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CreateServerOptions {
  const options: CreateServerOptions = {
    mode: parseServerMode(env.DOKPLOY_MCP_MODE),
    enabledTags: parseEnabledTags(env.DOKPLOY_ENABLED_TAGS),
  }

  const capabilityFlags = parseCapabilityFlags(env.DOKPLOY_MCP_CAPABILITIES)
  if (capabilityFlags) {
    options.capabilityFlags = capabilityFlags
  }

  return options
}

export function createServer(options: CreateServerOptions = {}): McpServer {
  const mode = options.mode ?? 'codemode'
  const enabledTags = normalizeEnabledTags(options.enabledTags)
  const capabilityFlags = normalizeCapabilityFlags(options.capabilityFlags)

  switch (mode) {
    case 'raw':
      return createRawModeServer({ enabledTags, capabilityFlags })
    case 'hybrid':
      return createHybridModeServer({ enabledTags, capabilityFlags })
    default:
      return createCodeModeServer({ capabilityFlags })
  }
}
