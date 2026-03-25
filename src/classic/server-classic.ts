import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { classicTools } from './tools/index.js'

export function createClassicServer(): McpServer {
  const server = new McpServer({
    name: 'dokploy-mcp-server',
    version: '2.0.0',
  })

  for (const tool of classicTools) {
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

  return server
}
