import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { codeModeTools } from './tools/index.js'

export function registerCodeModeTools(server: McpServer) {
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

export function createCodeModeServer(): McpServer {
  const server = new McpServer({
    name: 'dokploy-mcp-server-codemode',
    version: '3.0.0',
  })

  registerCodeModeTools(server)

  return server
}
