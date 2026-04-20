#!/usr/bin/env node

const args = process.argv.slice(2)

type ServerTransportMode = 'stdio' | 'http'
type CapabilityFlag = 'resources' | 'prompts' | 'completions' | 'sampling' | 'elicitation' | 'tasks'
type CapabilityFlags = Partial<Record<CapabilityFlag, boolean>>

interface StartServerOptions {
  mode?: 'codemode' | 'raw' | 'hybrid'
  enabledTags?: string[]
  capabilityFlags?: CapabilityFlags
  transport: ServerTransportMode
  host?: string
  port?: number
  mcpPath?: string
  healthPath?: string
}

function parseFlagValue(argumentsList: string[], flag: string) {
  const index = argumentsList.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  return argumentsList[index + 1]
}

function parseNumberFlag(value?: string) {
  if (!value) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseEnabledTags(value?: string) {
  if (!value) {
    return undefined
  }

  const tags = value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)

  return tags.length > 0 ? [...new Set(tags)] : undefined
}

function isCapabilityFlag(value: string): value is CapabilityFlag {
  return ['resources', 'prompts', 'completions', 'sampling', 'elicitation', 'tasks'].includes(value)
}

function parseCapabilityFlags(value?: string) {
  if (!value) {
    return undefined
  }

  const flags = value
    .split(',')
    .map((flag) => flag.trim().toLowerCase())
    .filter((flag) => isCapabilityFlag(flag))

  if (flags.length === 0) {
    return undefined
  }

  return Object.fromEntries([...new Set(flags)].map((flag) => [flag, true])) as CapabilityFlags
}

function resolveTransportFromEnv() {
  return process.env.DOKPLOY_MCP_TRANSPORT === 'http' ? 'http' : 'stdio'
}

function isServerCommand(command: string | undefined) {
  return command === 'serve' || command === 'serve-http' || command === 'serve-stdio'
}

function resolveServerOptions(argumentsList: string[]): StartServerOptions | null {
  if (argumentsList.length === 0) {
    const options: StartServerOptions = {
      transport: resolveTransportFromEnv(),
      mode: process.env.DOKPLOY_MCP_MODE as StartServerOptions['mode'] | undefined,
      enabledTags: parseEnabledTags(process.env.DOKPLOY_ENABLED_TAGS),
      host: process.env.DOKPLOY_MCP_HTTP_HOST,
      port: parseNumberFlag(process.env.DOKPLOY_MCP_HTTP_PORT),
      mcpPath: process.env.DOKPLOY_MCP_HTTP_PATH,
      healthPath: process.env.DOKPLOY_MCP_HEALTH_PATH,
    }

    const capabilityFlags = parseCapabilityFlags(process.env.DOKPLOY_MCP_CAPABILITIES)
    if (capabilityFlags) {
      options.capabilityFlags = capabilityFlags
    }

    return options
  }

  if (!isServerCommand(argumentsList[0])) {
    return null
  }

  const command = argumentsList[0]
  const transport =
    command === 'serve-http'
      ? 'http'
      : command === 'serve-stdio'
        ? 'stdio'
        : parseFlagValue(argumentsList, '--transport') === 'http'
          ? 'http'
          : resolveTransportFromEnv()

  const options: StartServerOptions = {
    transport,
    mode: parseFlagValue(argumentsList, '--mode') as StartServerOptions['mode'] | undefined,
    enabledTags: parseEnabledTags(parseFlagValue(argumentsList, '--enabled-tags')),
    host: parseFlagValue(argumentsList, '--host'),
    port: parseNumberFlag(parseFlagValue(argumentsList, '--port')),
    mcpPath: parseFlagValue(argumentsList, '--mcp-path'),
    healthPath: parseFlagValue(argumentsList, '--health-path'),
  }

  const capabilityFlags = parseCapabilityFlags(parseFlagValue(argumentsList, '--capabilities'))
  if (capabilityFlags) {
    options.capabilityFlags = capabilityFlags
  }

  return options
}

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
