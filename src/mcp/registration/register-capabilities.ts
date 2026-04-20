import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import type {
  McpCapabilityFlags,
  McpCapabilityRegistration,
  McpCapabilityRegistrationOptions,
} from './types.js'

function isCapabilityEnabled(
  family: McpCapabilityRegistration['family'],
  capabilityFlags?: McpCapabilityFlags,
) {
  if (family === 'tools') {
    return true
  }

  return capabilityFlags?.[family] === true
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
