import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createExecuteTool } from '../../codemode/tools/execute.js'
import { searchTool } from '../../codemode/tools/search.js'
import type { McpCapabilityRegistrationOptions } from '../registration/types.js'
import { createCapabilityRegistration } from '../registration/types.js'

function getCodeModeRuntimeTools(
  server: McpServer,
  options: McpCapabilityRegistrationOptions = {},
) {
  return [
    searchTool,
    createExecuteTool({
      server,
      capabilityFlags: options.capabilityFlags,
    }),
  ]
}

export function registerCodeModeToolCapabilities(
  server: McpServer,
  options: McpCapabilityRegistrationOptions = {},
) {
  for (const tool of getCodeModeRuntimeTools(server, options)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.schema,
        annotations: tool.annotations,
      },
      tool.handler,
    )
  }
}

export const codeModeToolsCapability = createCapabilityRegistration(
  'tools',
  registerCodeModeToolCapabilities,
)
