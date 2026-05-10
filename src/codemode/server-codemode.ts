import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerCodeModeToolCapabilities } from '../mcp/capabilities/tools.js'
import { registerCodeModeCapabilities } from '../mcp/registration/register-codemode-capabilities.js'
import { attachTaskRuntime, createTaskRuntime } from '../mcp/tasks/runtime.js'
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
  const taskRuntime = createTaskRuntime()
  const server = new McpServer(
    {
      name: 'dokploy-mcp-server-codemode',
      version: '3.1.0',
    },
    {
      taskStore: taskRuntime.store,
      taskMessageQueue: taskRuntime.messageQueue,
    },
  )
  attachTaskRuntime(server, taskRuntime)

  registerCodeModeServerCapabilities(server, options)

  return server
}
