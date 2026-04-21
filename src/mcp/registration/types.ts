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
export const MCP_IMPLEMENTED_CAPABILITY_FAMILIES = [
  'tools',
  'resources',
  'prompts',
  'completions',
] as const
export const MCP_STAGED_CAPABILITY_FAMILIES = ['resources', 'prompts', 'completions'] as const
export const MCP_PLANNED_CAPABILITY_FAMILIES = ['sampling', 'elicitation', 'tasks'] as const

export type McpImplementedCapabilityFamily = (typeof MCP_IMPLEMENTED_CAPABILITY_FAMILIES)[number]
export type McpStagedCapabilityFamily = (typeof MCP_STAGED_CAPABILITY_FAMILIES)[number]
export type McpCapabilityFlags = Partial<Record<McpStagedCapabilityFamily, boolean>>

export interface McpCapabilityRegistration {
  family: McpCapabilityFamily
  register: (server: McpServer, options: McpCapabilityRegistrationOptions) => void
}

export interface McpCapabilityRegistrationOptions {
  capabilityFlags?: McpCapabilityFlags
}

function noopCapabilityRegistration(
  _server: McpServer,
  _options: McpCapabilityRegistrationOptions,
) {
  // Intentionally empty: some capability families are staged before use.
}

export function createCapabilityRegistration(
  family: McpCapabilityFamily,
  register: (
    server: McpServer,
    options: McpCapabilityRegistrationOptions,
  ) => void = noopCapabilityRegistration,
): McpCapabilityRegistration {
  return { family, register }
}
