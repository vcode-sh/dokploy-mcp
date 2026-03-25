import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createCodeModeServer } from './codemode/server-codemode.js'

export function createServer(): McpServer {
  return createCodeModeServer()
}
