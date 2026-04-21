import * as p from '@clack/prompts'
import { resolveConfig, saveConfig, validateCredentials } from '../config/resolver.js'
import { getConfigFilePath } from '../config/types.js'

export interface SetupOptions {
  yes: boolean
  url?: string
  apiKey?: string
  save?: boolean
  client?: 'cursor' | 'claude-desktop' | 'codex' | 'claude-code'
}

interface ParsedSetupOptionsState {
  options: SetupOptions
  sawSaveFlag: boolean
}

export function toPanelUrl(url: string) {
  const stripped = url.trim().replace(/\/+$/, '')
  if (stripped.endsWith('/api/trpc')) {
    return stripped.slice(0, -'/api/trpc'.length)
  }
  if (stripped.endsWith('/api')) {
    return stripped.slice(0, -'/api'.length)
  }
  return stripped
}

function readFlagValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]
  if (!value) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function applySaveFlag(state: ParsedSetupOptionsState, value: boolean) {
  if (state.sawSaveFlag && state.options.save !== value) {
    throw new Error('Setup options cannot include both --save and --no-save')
  }

  state.sawSaveFlag = true
  state.options.save = value
}

function applySetupOption(
  arg: string,
  args: string[],
  index: number,
  state: ParsedSetupOptionsState,
) {
  switch (arg) {
    case '--yes':
    case '-y':
      state.options.yes = true
      return 0
    case '--url':
      state.options.url = readFlagValue(args, index, '--url')
      return 1
    case '--api-key':
      state.options.apiKey = readFlagValue(args, index, '--api-key')
      return 1
    case '--save':
      applySaveFlag(state, true)
      return 0
    case '--no-save':
      applySaveFlag(state, false)
      return 0
    case '--client': {
      const value = readFlagValue(args, index, '--client')
      if (!['cursor', 'claude-desktop', 'codex', 'claude-code'].includes(value)) {
        throw new Error('--client must be one of: cursor, claude-desktop, codex, claude-code')
      }
      state.options.client = value as SetupOptions['client']
      return 1
    }
    default:
      throw new Error(`Unknown setup option: ${arg}`)
  }
}

function validateParsedSetupOptions(options: SetupOptions) {
  if (options.url && !isHttpUrl(options.url)) {
    throw new Error('Setup --url must be a valid http or https URL')
  }

  if (options.apiKey !== undefined && options.apiKey.trim().length === 0) {
    throw new Error('Setup --api-key cannot be empty')
  }
}

export function parseSetupOptions(args: string[]): SetupOptions {
  const state: ParsedSetupOptionsState = {
    options: {
      yes: false,
    },
    sawSaveFlag: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === undefined) {
      continue
    }

    index += applySetupOption(arg, args, index, state)
  }

  validateParsedSetupOptions(state.options)
  return state.options
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function buildMcpClientSnippet(options: { savedToConfig: boolean; url?: string }) {
  const mcpServer: Record<string, unknown> = {
    command: 'npx',
    args: ['@vibetools/dokploy-mcp'],
  }

  if (!options.savedToConfig) {
    mcpServer.env = {
      DOKPLOY_URL: options.url ?? 'https://panel.example.com',
      DOKPLOY_API_KEY: 'dokp_...',
    }
  }

  return JSON.stringify(
    {
      mcpServers: {
        dokploy: mcpServer,
      },
    },
    null,
    2,
  )
}

export function buildClientSetupBlocks(options: {
  savedToConfig: boolean
  url?: string
  client?: SetupOptions['client']
}) {
  const panelUrl = options.url ?? 'https://panel.example.com'
  const jsonSnippet = buildMcpClientSnippet({
    savedToConfig: options.savedToConfig,
    url: panelUrl,
  })

  const blocks = options.savedToConfig
    ? [
        {
          title: 'Cursor',
          content: `Path: ~/.cursor/mcp.json\n\n${jsonSnippet}`,
          client: 'cursor' as const,
        },
        {
          title: 'Claude Desktop',
          content: `Use the same JSON block in your desktop MCP config:\n\n${jsonSnippet}`,
          client: 'claude-desktop' as const,
        },
        {
          title: 'Codex',
          content: 'codex mcp add dokploy -- npx @vibetools/dokploy-mcp',
          client: 'codex' as const,
        },
        {
          title: 'Claude Code',
          content: 'claude mcp add --transport stdio dokploy -- npx @vibetools/dokploy-mcp',
          client: 'claude-code' as const,
        },
      ]
    : [
        {
          title: 'Cursor',
          content: `Path: ~/.cursor/mcp.json\n\n${jsonSnippet}`,
          client: 'cursor' as const,
        },
        {
          title: 'Claude Desktop',
          content: `Use the same JSON block in your desktop MCP config:\n\n${jsonSnippet}`,
          client: 'claude-desktop' as const,
        },
        {
          title: 'Codex',
          content: `codex mcp add dokploy --env DOKPLOY_URL=${panelUrl} --env DOKPLOY_API_KEY=dokp_... -- npx @vibetools/dokploy-mcp`,
          client: 'codex' as const,
        },
        {
          title: 'Claude Code',
          content: `claude mcp add --transport stdio -e DOKPLOY_URL=${panelUrl} -e DOKPLOY_API_KEY=dokp_... dokploy -- npx @vibetools/dokploy-mcp`,
          client: 'claude-code' as const,
        },
      ]

  return options.client ? blocks.filter((block) => block.client === options.client) : blocks
}

function cancelSetup(): never {
  p.cancel('Setup cancelled.')
  process.exit(0)
}

async function confirmOrCancel(message: string, initialValue?: boolean) {
  const confirmed = await p.confirm({
    message,
    ...(initialValue !== undefined ? { initialValue } : {}),
  })
  if (p.isCancel(confirmed)) {
    cancelSetup()
  }
  return confirmed
}

async function promptCredentials(initial?: Partial<{ url: string; apiKey: string }>): Promise<{
  url: string
  apiKey: string
}> {
  const initialUrl = initial?.url ? toPanelUrl(initial.url) : undefined
  let url = initial?.url?.trim()
  if (!url) {
    const promptValue = await p.text({
      message: 'Dokploy server URL',
      placeholder: 'https://panel.example.com',
      ...(initialUrl ? { initialValue: initialUrl } : {}),
      validate: (value) => {
        if (!value?.trim()) return 'URL is required'
        if (!isHttpUrl(value.trim())) {
          return 'Please enter a valid http or https URL (e.g. https://panel.example.com)'
        }
      },
    })
    if (p.isCancel(promptValue)) {
      cancelSetup()
    }
    url = promptValue.trim()
  }

  let apiKey = initial?.apiKey?.trim()
  if (!apiKey) {
    const promptValue = await p.password({
      message: 'API key (from Dokploy Settings > Profile > API/CLI)',
      validate: (value) => {
        if (!value?.trim()) return 'API key is required'
      },
    })
    if (p.isCancel(promptValue)) {
      cancelSetup()
    }
    apiKey = promptValue.trim()
  }

  return { url, apiKey }
}

const sourceLabels: Record<string, string> = {
  env: 'environment variables',
  'config-file': 'config file',
  'dokploy-cli': 'Dokploy CLI config',
  'http-headers': 'HTTP headers',
}

function resolveNonInteractiveCredentials(
  existing: ReturnType<typeof resolveConfig>,
  options: SetupOptions,
) {
  const url = options.url?.trim() || existing?.url
  const apiKey = options.apiKey?.trim() || existing?.apiKey

  if (url && apiKey) {
    return { url, apiKey }
  }

  const missing: string[] = []
  if (!url) {
    missing.push('--url or an existing configured Dokploy URL')
  }
  if (!apiKey) {
    missing.push('--api-key or an existing configured Dokploy API key')
  }

  throw new Error(
    `Non-interactive setup needs ${missing.join(' and ')}. Provide the missing value or configure Dokploy credentials first.`,
  )
}

async function resolveWizardCredentials(
  existing: ReturnType<typeof resolveConfig>,
  options: SetupOptions,
) {
  if (options.yes) {
    return resolveNonInteractiveCredentials(existing, options)
  }

  if (options.url || options.apiKey) {
    p.log.info('Using setup flags for the values you already provided.')
    return promptCredentials({
      url: options.url,
      apiKey: options.apiKey,
    })
  }

  if (!existing) {
    p.log.info('No existing configuration found.')
    return promptCredentials()
  }

  const sourceLabel = sourceLabels[existing.source] ?? existing.source
  const configFilePath = existing.source === 'config-file' ? ` (${getConfigFilePath()})` : ''

  p.log.info(`Found existing credentials from ${sourceLabel}${configFilePath}`)
  p.log.info(`URL: ${toPanelUrl(existing.url)}`)

  const useExisting = await confirmOrCancel('Use existing credentials?')
  if (useExisting) {
    return {
      url: existing.url,
      apiKey: existing.apiKey,
    }
  }

  return promptCredentials()
}

async function validateCredentialsWithRetry(initial: { url: string; apiKey: string }) {
  let current = initial

  while (true) {
    const s = p.spinner()
    s.start('Validating credentials...')

    const validation = await validateCredentials(current.url, current.apiKey)
    if (validation.valid) {
      s.stop('Credentials validated successfully')
      return {
        credentials: current,
        validation,
      }
    }

    s.stop('Validation failed')
    p.log.error(validation.error ?? 'Could not connect to Dokploy server')

    const retry = await confirmOrCancel('Try different credentials?', true)
    if (!retry) {
      p.outro('Please check your URL and API key and try again.')
      process.exit(1)
    }

    current = await promptCredentials()
  }
}

async function resolveSaveToConfig(options: {
  existing: ReturnType<typeof resolveConfig>
  panelUrl: string
  apiKey: string
  setupOptions: SetupOptions
}) {
  const { existing, panelUrl, apiKey, setupOptions } = options
  const reusingConfigFile =
    existing?.source === 'config-file' &&
    panelUrl === toPanelUrl(existing.url) &&
    apiKey === existing.apiKey

  if (reusingConfigFile) {
    return {
      savedToConfig: true,
      shouldWriteConfig: false,
    }
  }

  if (setupOptions.save !== undefined) {
    return {
      savedToConfig: setupOptions.save,
      shouldWriteConfig: setupOptions.save,
    }
  }

  if (setupOptions.yes) {
    return {
      savedToConfig: true,
      shouldWriteConfig: true,
    }
  }

  const saveToConfig = await confirmOrCancel(
    'Save credentials to the local dokploy-mcp config file?',
    true,
  )
  return {
    savedToConfig: saveToConfig,
    shouldWriteConfig: saveToConfig,
  }
}

function showSetupResult(options: {
  savedToConfig: boolean
  shouldWriteConfig: boolean
  panelUrl: string
  apiKey: string
  client?: SetupOptions['client']
}) {
  const { savedToConfig, shouldWriteConfig, panelUrl, client } = options

  if (savedToConfig && shouldWriteConfig) {
    const configPath = saveConfig({ url: panelUrl, apiKey: options.apiKey })
    p.log.success(`Config saved to ${configPath}`)
    p.log.info(
      'Client snippets below can omit env vars because local credentials are now persisted.',
    )
  } else if (savedToConfig) {
    p.log.success(`Config already matches ${getConfigFilePath()}`)
    p.log.info('No rewrite needed. Client snippets below can omit env vars.')
  } else {
    p.log.info('Credentials were validated but not saved to disk.')
    p.log.info(
      'Client snippets below include env vars because there is no local config file to lean on.',
    )
  }

  p.note(
    buildMcpClientSnippet({
      savedToConfig,
      url: panelUrl,
    }),
    savedToConfig ? 'Generic JSON config (local credentials already saved)' : 'Generic JSON config',
  )

  for (const block of buildClientSetupBlocks({ savedToConfig, url: panelUrl })) {
    if (client && block.client !== client) {
      continue
    }
    p.note(block.content, block.title)
  }
}

export async function runSetup(options: SetupOptions = { yes: false }): Promise<void> {
  p.intro('@vibetools/dokploy-mcp setup')

  const existing = resolveConfig()
  const credentials = await resolveWizardCredentials(existing, options)
  const { credentials: validatedCredentials, validation } =
    await validateCredentialsWithRetry(credentials)

  if (validation.user) p.log.success(`Authenticated as: ${validation.user}`)
  if (validation.version) p.log.success(`Dokploy version: ${validation.version}`)

  const panelUrl = toPanelUrl(validation.resolvedUrl ?? validatedCredentials.url)
  const persistence = await resolveSaveToConfig({
    existing,
    panelUrl,
    apiKey: validatedCredentials.apiKey,
    setupOptions: options,
  })

  showSetupResult({
    savedToConfig: persistence.savedToConfig,
    shouldWriteConfig: persistence.shouldWriteConfig,
    panelUrl,
    apiKey: validatedCredentials.apiKey,
    client: options.client,
  })

  p.outro('Setup complete! Restart your MCP client to connect.')
}
