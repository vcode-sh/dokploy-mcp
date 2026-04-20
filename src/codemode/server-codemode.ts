import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerCodeModeToolCapabilities } from '../mcp/capabilities/tools.js'
import { registerCodeModeCapabilities } from '../mcp/registration/register-codemode-capabilities.js'
import type { ServerCapabilityFlags } from '../server.js'

interface CodeModeServerOptions {
  capabilityFlags?: ServerCapabilityFlags
}

export function registerCodeModeTools(server: McpServer) {
  registerCodeModeToolCapabilities(server)
}

export function registerCodeModeServerCapabilities(
  server: McpServer,
  options: CodeModeServerOptions = {},
) {
  registerCodeModeCapabilities(server, {
    capabilityFlags: options.capabilityFlags,
  })
}

export function createCodeModeServer(options: CodeModeServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'dokploy-mcp-server-codemode',
    version: '3.0.0',
  })

  registerCodeModeServerCapabilities(server, options)

  return server
}
