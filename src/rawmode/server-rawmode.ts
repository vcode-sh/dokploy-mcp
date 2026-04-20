import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerCodeModeServerCapabilities } from '../codemode/server-codemode.js'
import type { ServerCapabilityFlags } from '../server.js'
import { type RawModeOptions, registerRawModeTools } from './tools.js'

const SERVER_VERSION = '3.0.0'

interface ModeServerOptions extends RawModeOptions {
  capabilityFlags?: ServerCapabilityFlags
}

function createModeServer(name: string) {
  return new McpServer({
    name,
    version: SERVER_VERSION,
  })
}

export function createRawModeServer(options: ModeServerOptions = {}) {
  const server = createModeServer('dokploy-mcp-server-rawmode')
  registerRawModeTools(server, options)
  return server
}

export function createHybridModeServer(options: ModeServerOptions = {}) {
  const server = createModeServer('dokploy-mcp-server-hybrid')
  registerCodeModeServerCapabilities(server, {
    capabilityFlags: options.capabilityFlags,
  })
  registerRawModeTools(server, options)
  return server
}
