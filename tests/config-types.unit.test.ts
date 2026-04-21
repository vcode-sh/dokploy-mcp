import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadConfigTypesModule(
  platformValue: 'darwin' | 'linux' | 'win32',
  env: NodeJS.ProcessEnv = {},
) {
  vi.resetModules()
  vi.doMock('node:os', () => ({
    platform: () => platformValue,
    homedir: () => '/mock/home',
  }))

  const previousEnv = process.env
  process.env = {
    ...previousEnv,
    ...env,
  }

  const module = await import('../src/config/types.js')
  return {
    module,
    restoreEnv() {
      process.env = previousEnv
    },
  }
}

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('config types platform helpers', () => {
  it('uses APPDATA on Windows when available', async () => {
    const loaded = await loadConfigTypesModule('win32', {
      APPDATA: 'C:/Users/test/AppData/Roaming',
    })

    try {
      expect(loaded.module.getConfigDir()).toBe('C:/Users/test/AppData/Roaming/dokploy-mcp')
      expect(loaded.module.getConfigFilePath()).toBe(
        'C:/Users/test/AppData/Roaming/dokploy-mcp/config.json',
      )
    } finally {
      loaded.restoreEnv()
    }
  })

  it('falls back to the user home directory on Windows when APPDATA is missing', async () => {
    const loaded = await loadConfigTypesModule('win32')

    try {
      expect(loaded.module.getConfigDir()).toBe('/mock/home/AppData/Roaming/dokploy-mcp')
    } finally {
      loaded.restoreEnv()
    }
  })

  it('uses XDG_CONFIG_HOME on Linux when provided', async () => {
    const loaded = await loadConfigTypesModule('linux', {
      XDG_CONFIG_HOME: '/tmp/xdg-config',
    })

    try {
      expect(loaded.module.getConfigDir()).toBe('/tmp/xdg-config/dokploy-mcp')
      expect(loaded.module.getConfigFilePath()).toBe('/tmp/xdg-config/dokploy-mcp/config.json')
    } finally {
      loaded.restoreEnv()
    }
  })
})
