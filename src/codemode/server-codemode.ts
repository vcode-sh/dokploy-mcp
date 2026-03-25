import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { codeModeTools } from './tools/index.js'

export function createCodeModeServer(): McpServer {
  const server = new McpServer({
    name: 'dokploy-mcp-server-codemode',
    version: '2.0.0',
  })

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

  return server
}
