import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createExecuteTool } from '../../codemode/tools/execute.js'
import { listProfilesTool } from '../../codemode/tools/list-profiles.js'
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
    listProfilesTool,
  ]
}

export function registerCodeModeToolCapabilities(
  server: McpServer,
  options: McpCapabilityRegistrationOptions = {},
) {
  for (const tool of getCodeModeRuntimeTools(server, options)) {
    if (
      tool.taskHandler &&
      (tool.execution?.taskSupport === 'optional' || tool.execution?.taskSupport === 'required')
    ) {
      server.experimental.tasks.registerToolTask(
        tool.name,
        {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.schema,
          annotations: tool.annotations,
          execution: {
            taskSupport: tool.execution.taskSupport,
          },
        },
        tool.taskHandler as never,
      )
      continue
    }

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
