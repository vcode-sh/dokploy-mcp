import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import type {
  McpCapabilityFlags,
  McpCapabilityRegistration,
  McpCapabilityRegistrationOptions,
} from './types.js'
import { MCP_STAGED_CAPABILITY_FAMILIES } from './types.js'

function isCapabilityEnabled(
  family: McpCapabilityRegistration['family'],
  capabilityFlags?: McpCapabilityFlags,
) {
  if (family === 'tools') {
    return true
  }

  if (
    !MCP_STAGED_CAPABILITY_FAMILIES.includes(
      family as (typeof MCP_STAGED_CAPABILITY_FAMILIES)[number],
    )
  ) {
    return false
  }

  return capabilityFlags?.[family as keyof McpCapabilityFlags] === true
}

export function registerMcpCapabilities(
  server: McpServer,
  registrations: readonly McpCapabilityRegistration[],
  options: McpCapabilityRegistrationOptions = {},
) {
  for (const registration of registrations) {
    if (!isCapabilityEnabled(registration.family, options.capabilityFlags)) {
      continue
    }

    registration.register(server)
  }
}
