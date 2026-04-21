export async function runCli(args: string[]): Promise<void> {
  const command = args[0]

  switch (command) {
    case 'setup':
    case 'init':
    case 'auth': {
      const { parseSetupOptions, runSetup } = await import('./setup.js')
      await runSetup(parseSetupOptions(args.slice(1)))
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
  npx @vibetools/dokploy-mcp setup --yes  Validate and save without prompts when enough input exists
  npx @vibetools/dokploy-mcp version      Show version

Commands:
  setup, init, auth    Setup wizard or non-interactive setup with flags
  version, -v          Show version number

Setup Flags:
  --yes, -y            Non-interactive setup. Reuse existing config unless you override with flags.
  --url <url>          Dokploy panel URL to validate
  --api-key <key>      Dokploy API key to validate
  --save               Save credentials to ~/.config/dokploy-mcp/config.json without asking
  --no-save            Validate only. Do not write the local config file
  --client <name>      Print setup output only for one client: cursor, claude-desktop, codex, claude-code

Environment Variables:
  DOKPLOY_URL          Dokploy panel URL (e.g. https://panel.example.com)
  DOKPLOY_API_KEY      API key from Dokploy Settings > Profile > API/CLI
  DOKPLOY_TIMEOUT      Request timeout in ms (default: 30000)
  DOKPLOY_MCP_SANDBOX_RUNTIME subprocess or local (default: subprocess)

Documentation:
  https://github.com/vcode-sh/dokploy-mcp
`)
}
