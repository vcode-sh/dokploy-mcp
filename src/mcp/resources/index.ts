import { type McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'

import {
  codeModeResourceTemplates,
  createResourceExecutor,
  readCodeModeResource,
} from './runtime.js'

export function registerCodeModeResources(server: McpServer) {
  const executor = createResourceExecutor()

  for (const definition of codeModeResourceTemplates) {
    const listResources = definition.listResources

    server.registerResource(
      definition.name,
      new ResourceTemplate(definition.uriTemplate, {
        list: listResources
          ? async () => ({
              resources: await listResources(executor),
            })
          : undefined,
      }),
      {
        title: definition.title,
        description: definition.description,
        mimeType: 'application/json',
      },
      async (uri, variables) => readCodeModeResource(uri, variables, definition.name, executor),
    )
  }
}
