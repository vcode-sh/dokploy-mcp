#!/usr/bin/env node

const args = process.argv.slice(2)

if (args.length > 0) {
  // CLI mode - handle subcommands
  import('./cli/index.js')
    .then(({ runCli }) => runCli(args))
    .catch((err: unknown) => {
      console.error('Error:', err instanceof Error ? err.message : err)
      process.exit(1)
    })
} else {
  // MCP server mode - start stdio transport
  Promise.all([import('@modelcontextprotocol/sdk/server/stdio.js'), import('./server.js')])
    .then(async ([{ StdioServerTransport }, { createServer }]) => {
      const server = createServer()
      const transport = new StdioServerTransport()
      await server.connect(transport)
    })
    .catch((err: unknown) => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}
