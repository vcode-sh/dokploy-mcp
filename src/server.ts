import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createClassicServer } from './classic/server-classic.js'
import { createCodeModeServer } from './codemode/server-codemode.js'

export type ServerMode = 'classic' | 'codemode'

export function resolveServerMode(value = process.env.DOKPLOY_MCP_MODE): ServerMode {
  return value === 'classic' ? 'classic' : 'codemode'
}

export function createServer(mode = resolveServerMode()): McpServer {
  if (mode === 'codemode') {
    return createCodeModeServer()
  }

  return createClassicServer()
}
