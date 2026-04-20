import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const MCP_CAPABILITY_FAMILIES = [
  'tools',
  'resources',
  'prompts',
  'completions',
  'sampling',
  'elicitation',
  'tasks',
] as const

export type McpCapabilityFamily = (typeof MCP_CAPABILITY_FAMILIES)[number]
export const MCP_STAGED_CAPABILITY_FAMILIES = MCP_CAPABILITY_FAMILIES.filter(
  (family) => family !== 'tools',
) as Exclude<McpCapabilityFamily, 'tools'>[]
export type McpStagedCapabilityFamily = (typeof MCP_STAGED_CAPABILITY_FAMILIES)[number]
export type McpCapabilityFlags = Partial<Record<McpStagedCapabilityFamily, boolean>>

export interface McpCapabilityRegistration {
  family: McpCapabilityFamily
  register: (server: McpServer) => void
}

export interface McpCapabilityRegistrationOptions {
  capabilityFlags?: McpCapabilityFlags
}

function noopCapabilityRegistration(_server: McpServer) {
  // Intentionally empty: some capability families are staged before use.
}

export function createCapabilityRegistration(
  family: McpCapabilityFamily,
  register: (server: McpServer) => void = noopCapabilityRegistration,
): McpCapabilityRegistration {
  return { family, register }
}
