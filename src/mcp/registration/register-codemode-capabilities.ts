import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { codeModeCapabilities } from '../capabilities/index.js'
import { registerMcpCapabilities } from './register-capabilities.js'
import type { McpCapabilityRegistrationOptions } from './types.js'

export function registerCodeModeCapabilities(
  server: McpServer,
  options: McpCapabilityRegistrationOptions = {},
) {
  registerMcpCapabilities(server, codeModeCapabilities, options)
}
