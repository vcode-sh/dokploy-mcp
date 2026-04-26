import { homedir, platform } from 'node:os'
import { join } from 'node:path'

export interface DokployConfig {
  url: string // API base URL (e.g., https://panel.example.com/api)
  apiKey: string // Dokploy API key
}

export type ConfigSource = 'env' | 'profiles-json' | 'config-file' | 'dokploy-cli' | 'http-headers'

export interface ResolvedConfig extends DokployConfig {
  source: ConfigSource
  timeout: number
  profile?: string
}

export interface ConfigFile {
  url: string
  apiKey: string
}

export interface ListedProfile {
  name: string
  url: string
  source: ConfigSource
}

/**
 * Returns the platform-appropriate config directory for dokploy-mcp.
 *
 * - macOS: ~/.config/dokploy-mcp
 * - Linux: $XDG_CONFIG_HOME/dokploy-mcp or ~/.config/dokploy-mcp
 * - Windows: %APPDATA%/dokploy-mcp
 */
export function getConfigDir(): string {
  const os = platform()

  if (os === 'win32') {
    const appData = process.env.APPDATA
    if (appData) {
      return join(appData, 'dokploy-mcp')
    }
    return join(homedir(), 'AppData', 'Roaming', 'dokploy-mcp')
  }

  if (os === 'linux') {
    const xdgConfig = process.env.XDG_CONFIG_HOME
    if (xdgConfig) {
      return join(xdgConfig, 'dokploy-mcp')
    }
  }

  // macOS and Linux fallback
  return join(homedir(), '.config', 'dokploy-mcp')
}

/**
 * Returns the full path to the config file.
 */
export function getConfigFilePath(): string {
  return join(getConfigDir(), 'config.json')
}
