#!/usr/bin/env node

import { resolveServerOptions, type StartServerOptions } from './server-entry/options.js'

const args = process.argv.slice(2)

async function startStdioServer(options: StartServerOptions) {
  const [{ StdioServerTransport }, { createServer }] = await Promise.all([
    import('@modelcontextprotocol/sdk/server/stdio.js'),
    import('./server.js'),
  ])

  const server = createServer({
    mode: options.mode,
    enabledTags: options.enabledTags,
    capabilityFlags: options.capabilityFlags,
  })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

async function startHttpTransport(options: StartServerOptions) {
  const { startHttpServer } = await import('./http-server.js')
  const handle = await startHttpServer({
    mode: options.mode,
    enabledTags: options.enabledTags,
    capabilityFlags: options.capabilityFlags,
    host: options.host,
    port: options.port,
    mcpPath: options.mcpPath,
    healthPath: options.healthPath,
    allowedOrigins: options.allowedOrigins,
    allowConfigFallback: options.allowConfigFallback,
  })

  console.error(`Dokploy MCP HTTP server listening at ${handle.mcpUrl}`)
}

async function main() {
  const serverOptions = resolveServerOptions(args)
  if (!serverOptions) {
    const { runCli } = await import('./cli/index.js')
    await runCli(args)
    return
  }

  if (serverOptions.transport === 'http') {
    await startHttpTransport(serverOptions)
    return
  }

  await startStdioServer(serverOptions)
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
