import * as p from '@clack/prompts'
import { resolveConfig, saveConfig, validateCredentials } from '../config/resolver.js'
import { getConfigFilePath } from '../config/types.js'

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

export function buildClientSetupSteps(options: { savedToConfig: boolean }) {
  if (options.savedToConfig) {
    return [
      'Codex:         codex mcp add dokploy -- npx @vibetools/dokploy-mcp',
      'Claude Code:   claude mcp add --transport stdio dokploy -- npx @vibetools/dokploy-mcp',
      'Cursor:        use the JSON snippet above in ~/.cursor/mcp.json',
      'Claude Desktop: use the JSON snippet above in your desktop MCP config',
    ]
  }

  return [
    'Codex:         codex mcp add dokploy --env DOKPLOY_URL=https://panel.example.com --env DOKPLOY_API_KEY=dokp_... -- npx @vibetools/dokploy-mcp',
    'Claude Code:   claude mcp add --transport stdio -e DOKPLOY_URL=https://panel.example.com -e DOKPLOY_API_KEY=dokp_... dokploy -- npx @vibetools/dokploy-mcp',
    'Cursor:        use the JSON snippet above in ~/.cursor/mcp.json',
    'Claude Desktop: use the JSON snippet above in your desktop MCP config',
  ]
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

async function promptCredentials(): Promise<{ url: string; apiKey: string }> {
  const url = await p.text({
    message: 'Dokploy server URL',
    placeholder: 'https://panel.example.com',
    validate: (value) => {
      if (!value?.trim()) return 'URL is required'
      if (!isHttpUrl(value.trim())) {
        return 'Please enter a valid http or https URL (e.g. https://panel.example.com)'
      }
    },
  })
  if (p.isCancel(url)) {
    cancelSetup()
  }

  const apiKey = await p.password({
    message: 'API key (from Dokploy Settings > Profile > API/CLI)',
    validate: (value) => {
      if (!value?.trim()) return 'API key is required'
    },
  })
  if (p.isCancel(apiKey)) {
    cancelSetup()
  }

  return { url: url.trim(), apiKey: apiKey.trim() }
}

const sourceLabels: Record<string, string> = {
  env: 'environment variables',
  'config-file': 'config file',
  'dokploy-cli': 'Dokploy CLI config',
  'http-headers': 'HTTP headers',
}

async function resolveWizardCredentials(existing: ReturnType<typeof resolveConfig>) {
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
  url: string
  apiKey: string
}) {
  const { existing, url, apiKey } = options
  const reusingConfigFile =
    existing?.source === 'config-file' && url === existing.url && apiKey === existing.apiKey

  if (reusingConfigFile) {
    return true
  }

  return confirmOrCancel('Save credentials to the local dokploy-mcp config file?', true)
}

function showSetupResult(options: { savedToConfig: boolean; panelUrl: string; apiKey: string }) {
  const { savedToConfig, panelUrl } = options

  if (savedToConfig) {
    const configPath = saveConfig({ url: panelUrl, apiKey: options.apiKey })
    p.log.success(`Config saved to ${configPath}`)
    p.log.info(
      'Client snippets below can omit env vars because local credentials are now persisted.',
    )
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
    'Add to your MCP client config',
  )

  for (const line of buildClientSetupSteps({ savedToConfig })) {
    p.log.step(line)
  }
}

export async function runSetup(): Promise<void> {
  p.intro('@vibetools/dokploy-mcp setup')

  const existing = resolveConfig()
  const credentials = await resolveWizardCredentials(existing)
  const { credentials: validatedCredentials, validation } =
    await validateCredentialsWithRetry(credentials)

  if (validation.user) p.log.success(`Authenticated as: ${validation.user}`)
  if (validation.version) p.log.success(`Dokploy version: ${validation.version}`)

  const panelUrl = toPanelUrl(validation.resolvedUrl ?? validatedCredentials.url)
  const savedToConfig = await resolveSaveToConfig({
    existing,
    url: validatedCredentials.url,
    apiKey: validatedCredentials.apiKey,
  })

  showSetupResult({
    savedToConfig,
    panelUrl,
    apiKey: validatedCredentials.apiKey,
  })

  p.outro('Setup complete! Restart your MCP client to connect.')
}
