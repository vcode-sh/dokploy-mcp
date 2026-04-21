import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createCapabilityRegistration } from '../registration/types.js'

export function registerCodeModeTasksCapability(server: McpServer) {
  server.server.registerCapabilities({
    tasks: {
      list: {},
      cancel: {},
      requests: {
        tools: {
          call: {},
        },
      },
    },
  })
}

export const codeModeTasksCapability = createCapabilityRegistration(
  'tasks',
  registerCodeModeTasksCapability,
)
