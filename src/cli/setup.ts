import * as p from '@clack/prompts'
import { resolveConfig, saveConfig, validateCredentials } from '../config/resolver.js'
import { getConfigFilePath } from '../config/types.js'

async function promptCredentials(): Promise<{ url: string; apiKey: string }> {
  const url = await p.text({
    message: 'Dokploy server URL',
    placeholder: 'https://panel.example.com',
    validate: (value) => {
      if (!value?.trim()) return 'URL is required'
      try {
        new URL(value.trim())
      } catch {
        return 'Please enter a valid URL (e.g. https://panel.example.com)'
      }
    },
  })
  if (p.isCancel(url)) {
    p.cancel('Setup cancelled.')
    process.exit(0)
  }

  const apiKey = await p.password({
    message: 'API key (from Dokploy Settings > API)',
    validate: (value) => {
      if (!value?.trim()) return 'API key is required'
    },
  })
  if (p.isCancel(apiKey)) {
    p.cancel('Setup cancelled.')
    process.exit(0)
  }

  return { url: url.trim(), apiKey: apiKey.trim() }
}

const sourceLabels: Record<string, string> = {
  env: 'environment variables',
  'config-file': 'config file',
  'dokploy-cli': 'Dokploy CLI config',
}

export async function runSetup(): Promise<void> {
  p.intro('@vibetools/dokploy-mcp setup')

  // 1. Check for existing configuration
  const existing = resolveConfig()

  let url: string
  let apiKey: string

  if (existing) {
    const sourceLabel = sourceLabels[existing.source] ?? existing.source
    const configFilePath = existing.source === 'config-file' ? ` (${getConfigFilePath()})` : ''

    p.log.info(`Found existing credentials from ${sourceLabel}${configFilePath}`)
    p.log.info(`URL: ${existing.url}`)

    const useExisting = await p.confirm({
      message: 'Use existing credentials?',
    })
    if (p.isCancel(useExisting)) {
      p.cancel('Setup cancelled.')
      process.exit(0)
    }

    if (useExisting) {
      url = existing.url
      apiKey = existing.apiKey
    } else {
      const result = await promptCredentials()
      url = result.url
      apiKey = result.apiKey
    }
  } else {
    p.log.info('No existing configuration found.')
    const result = await promptCredentials()
    url = result.url
    apiKey = result.apiKey
  }

  // 2. Validate credentials against the Dokploy API
  const s = p.spinner()
  s.start('Validating credentials...')

  const validation = await validateCredentials(url, apiKey)

  if (!validation.valid) {
    s.stop('Validation failed')
    p.log.error(validation.error ?? 'Could not connect to Dokploy server')
    p.outro('Please check your URL and API key and try again.')
    process.exit(1)
  }

  s.stop('Credentials validated successfully')
  if (validation.user) p.log.success(`Authenticated as: ${validation.user}`)
  if (validation.version) p.log.success(`Dokploy version: ${validation.version}`)

  // Use the normalized URL if the validator resolved one
  if (validation.resolvedUrl) url = validation.resolvedUrl

  // 3. Save config to disk
  const configPath = saveConfig({ url, apiKey })
  p.log.success(`Config saved to ${configPath}`)

  // 4. Show MCP client configuration snippet
  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        dokploy: {
          command: 'npx',
          args: ['@vibetools/dokploy-mcp'],
        },
      },
    },
    null,
    2,
  )

  p.note(mcpConfig, 'Add to your MCP client config')

  p.log.step('Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json')
  p.log.step('Claude Code:    .claude/settings.json or .mcp.json')
  p.log.step('Cursor:         ~/.cursor/mcp.json')
  p.log.step('VS Code:        .vscode/mcp.json')

  // 5. Done
  p.outro('Setup complete! Restart your MCP client to connect.')
}
