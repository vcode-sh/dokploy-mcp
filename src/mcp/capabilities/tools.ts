import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { codeModeTools } from '../../codemode/tools/index.js'
import { createCapabilityRegistration } from '../registration/types.js'

export function registerCodeModeToolCapabilities(server: McpServer) {
  for (const tool of codeModeTools) {
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
