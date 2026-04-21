import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerCodeModeServerCapabilities } from '../codemode/server-codemode.js'
import { registerCodeModeSharedCapabilities } from '../mcp/registration/register-codemode-capabilities.js'
import { attachTaskRuntime, createTaskRuntime } from '../mcp/tasks/runtime.js'
import type { ServerCapabilityFlags } from '../server.js'
import { type RawModeOptions, registerRawModeTools } from './tools.js'

const SERVER_VERSION = '3.0.0'

interface ModeServerOptions extends RawModeOptions {
  capabilityFlags?: ServerCapabilityFlags
}

function createModeServer(name: string, includeTaskRuntime = false) {
  if (!includeTaskRuntime) {
    return new McpServer({
      name,
      version: SERVER_VERSION,
    })
  }

  const taskRuntime = createTaskRuntime()
  const server = new McpServer(
    {
      name,
      version: SERVER_VERSION,
    },
    {
      taskStore: taskRuntime.store,
      taskMessageQueue: taskRuntime.messageQueue,
    },
  )
  attachTaskRuntime(server, taskRuntime)
  return server
}

export function createRawModeServer(options: ModeServerOptions = {}) {
  const server = createModeServer('dokploy-mcp-server-rawmode')
  registerCodeModeSharedCapabilities(server, {
    capabilityFlags: options.capabilityFlags,
  })
  registerRawModeTools(server, options)
  return server
}

export function createHybridModeServer(options: ModeServerOptions = {}) {
  const server = createModeServer('dokploy-mcp-server-hybrid', true)
  registerCodeModeServerCapabilities(server, {
    capabilityFlags: options.capabilityFlags,
  })
  registerRawModeTools(server, options)
  return server
}
