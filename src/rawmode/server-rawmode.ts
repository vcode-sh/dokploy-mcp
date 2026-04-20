import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerCodeModeTools } from '../codemode/server-codemode.js'
import { type RawModeOptions, registerRawModeTools } from './tools.js'

const SERVER_VERSION = '3.0.0'

function createModeServer(name: string) {
  return new McpServer({
    name,
    version: SERVER_VERSION,
  })
}

export function createRawModeServer(options: RawModeOptions = {}) {
  const server = createModeServer('dokploy-mcp-server-rawmode')
  registerRawModeTools(server, options)
  return server
}

export function createHybridModeServer(options: RawModeOptions = {}) {
  const server = createModeServer('dokploy-mcp-server-hybrid')
  registerCodeModeTools(server)
  registerRawModeTools(server, options)
  return server
}
