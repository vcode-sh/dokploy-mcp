#!/usr/bin/env node

const rawArgs = process.argv.slice(2)

function consumeModeArg(args: string[]) {
  const nextArgs = [...args]
  let mode: 'classic' | 'codemode' | undefined

  const modeFlagIndex = nextArgs.indexOf('--mode')
  if (modeFlagIndex !== -1) {
    const value = nextArgs[modeFlagIndex + 1]
    if (value === 'classic' || value === 'codemode') {
      mode = value
      nextArgs.splice(modeFlagIndex, 2)
    }
  }

  return { mode, args: nextArgs }
}

const { mode, args } = consumeModeArg(rawArgs)

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
      const server = createServer(mode)
      const transport = new StdioServerTransport()
      await server.connect(transport)
    })
    .catch((err: unknown) => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}
