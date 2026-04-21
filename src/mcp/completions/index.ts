import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import type { McpCapabilityRegistrationOptions } from '../registration/types.js'

export * from './runtime.js'

export function registerCodeModeCompletions(
  _server: McpServer,
  _options: McpCapabilityRegistrationOptions = {},
) {
  // Completion handlers are attached through prompt arg schemas when the completions flag is on.
}
