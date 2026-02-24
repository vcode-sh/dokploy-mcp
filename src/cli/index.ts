export async function runCli(args: string[]): Promise<void> {
  const command = args[0]

  switch (command) {
    case 'setup':
    case 'init':
    case 'auth': {
      const { runSetup } = await import('./setup.js')
      await runSetup()
      break
    }

    case 'version':
    case '--version':
    case '-v': {
      const { readFileSync } = await import('node:fs')
      const { fileURLToPath } = await import('node:url')
      const { dirname, join } = await import('node:path')
      const currentDir = dirname(fileURLToPath(import.meta.url))
      const pkg = JSON.parse(
        readFileSync(join(currentDir, '..', '..', 'package.json'), 'utf8'),
      ) as { version: string }
      console.log(`@vibetools/dokploy-mcp v${pkg.version}`)
      break
    }

    default:
      printHelp()
      break
  }
}

function printHelp(): void {
  console.log(`
@vibetools/dokploy-mcp - MCP server for the Dokploy API

Usage:
  npx @vibetools/dokploy-mcp              Start MCP server (stdio transport)
  npx @vibetools/dokploy-mcp setup        Configure credentials and MCP client
  npx @vibetools/dokploy-mcp version      Show version

Commands:
  setup, init, auth    Interactive setup wizard
  version, -v          Show version number

Environment Variables:
  DOKPLOY_URL          Dokploy panel URL (e.g. https://panel.example.com)
  DOKPLOY_API_KEY      API key from Dokploy Settings
  DOKPLOY_TIMEOUT      Request timeout in ms (default: 30000)

Documentation:
  https://github.com/vcode-sh/dokploy-mcp
`)
}
