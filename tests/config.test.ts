import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { execSyncMock, existsSyncMock, mkdirSyncMock, readFileSyncMock, writeFileSyncMock } =
  vi.hoisted(() => ({
    execSyncMock: vi.fn(),
    existsSyncMock: vi.fn(),
    mkdirSyncMock: vi.fn(),
    readFileSyncMock: vi.fn(),
    writeFileSyncMock: vi.fn(),
  }))

vi.mock('node:child_process', () => ({
  execSync: execSyncMock,
}))

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
}))

import {
  createResolvedConfig,
  normalizeUrl,
  resolveConfig,
  saveConfig,
  validateCredentials,
  withResolvedConfigOverride,
} from '../src/config/resolver.js'
import { getConfigDir, getConfigFilePath } from '../src/config/types.js'

const mockedGlobalRoot = '/mock/global/node_modules'
const mockedCliConfigPath = join(mockedGlobalRoot, '@dokploy', 'cli', 'config.json')

function configureConfigSources(options?: {
  cliConfigContent?: string
  configFileContent?: string
  configFileReadError?: Error
}) {
  const { cliConfigContent, configFileContent, configFileReadError } = options ?? {}
  const configFilePath = getConfigFilePath()

  execSyncMock.mockReturnValue(mockedGlobalRoot)
  existsSyncMock.mockImplementation((filePath) => {
    const path = String(filePath)

    if (path === configFilePath) {
      return configFileContent !== undefined || configFileReadError !== undefined
    }

    if (path === mockedCliConfigPath) {
      return cliConfigContent !== undefined
    }

    return false
  })

  readFileSyncMock.mockImplementation((filePath) => {
    const path = String(filePath)

    if (path === configFilePath) {
      if (configFileReadError) {
        throw configFileReadError
      }
      if (configFileContent !== undefined) {
        return configFileContent
      }
    }

    if (path === mockedCliConfigPath && cliConfigContent !== undefined) {
      return cliConfigContent
    }

    throw new Error(`Unexpected readFileSync path: ${path}`)
  })
}

function createJsonResponse(status: number, json: unknown, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async json() {
      return json
    },
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  execSyncMock.mockReset()
  existsSyncMock.mockReset()
  mkdirSyncMock.mockReset()
  readFileSyncMock.mockReset()
  writeFileSyncMock.mockReset()
  configureConfigSources()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('normalizeUrl', () => {
  it('adds /api/trpc to a bare URL', () => {
    expect(normalizeUrl('https://panel.example.com')).toBe('https://panel.example.com/api/trpc')
  })

  it('adds /trpc to an /api URL', () => {
    expect(normalizeUrl('https://panel.example.com/api')).toBe('https://panel.example.com/api/trpc')
  })

  it('returns an /api/trpc URL unchanged', () => {
    expect(normalizeUrl('https://panel.example.com/api/trpc')).toBe(
      'https://panel.example.com/api/trpc',
    )
  })

  it('strips trailing slashes before normalizing', () => {
    expect(normalizeUrl('https://panel.example.com/')).toBe('https://panel.example.com/api/trpc')
    expect(normalizeUrl('https://panel.example.com///')).toBe('https://panel.example.com/api/trpc')
  })

  it('handles URLs with ports and suffix variants', () => {
    expect(normalizeUrl('https://panel.example.com:3000')).toBe(
      'https://panel.example.com:3000/api/trpc',
    )
    expect(normalizeUrl('https://panel.example.com:3000/api/')).toBe(
      'https://panel.example.com:3000/api/trpc',
    )
    expect(normalizeUrl('https://panel.example.com:3000/api/trpc/')).toBe(
      'https://panel.example.com:3000/api/trpc',
    )
  })
})

describe('resolveConfig', () => {
  it('prefers env vars over config file and Dokploy CLI config', () => {
    configureConfigSources({
      configFileContent: JSON.stringify({
        url: 'https://file.example.com/api',
        apiKey: 'file-key',
      }),
      cliConfigContent: JSON.stringify({
        url: 'https://cli.example.com',
        token: 'cli-key',
      }),
    })

    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')

    expect(resolveConfig()).toEqual({
      url: 'https://env.example.com/api/trpc',
      apiKey: 'env-key',
      source: 'env',
      timeout: 30_000,
    })
  })

  it('prefers request-scoped HTTP header overrides over env and file-based config', () => {
    configureConfigSources({
      configFileContent: JSON.stringify({
        url: 'https://file.example.com/api',
        apiKey: 'file-key',
      }),
    })
    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')

    const override = createResolvedConfig(
      'https://remote.example.com',
      'remote-key',
      'http-headers',
      45_000,
    )

    const resolved = withResolvedConfigOverride(override, () => resolveConfig())
    expect(resolved).toEqual({
      url: 'https://remote.example.com/api/trpc',
      apiKey: 'remote-key',
      source: 'http-headers',
      timeout: 45_000,
    })
  })

  it('can ignore request-scoped overrides when HTTP fallback needs the local sources only', () => {
    configureConfigSources({
      configFileContent: JSON.stringify({
        url: 'https://file.example.com/api',
        apiKey: 'file-key',
      }),
    })

    const override = createResolvedConfig(
      'https://remote.example.com',
      'remote-key',
      'http-headers',
      45_000,
    )

    const resolved = withResolvedConfigOverride(override, () =>
      resolveConfig({ includeOverride: false }),
    )

    expect(resolved).toEqual({
      url: 'https://file.example.com/api/trpc',
      apiKey: 'file-key',
      source: 'config-file',
      timeout: 30_000,
    })
  })

  it('prefers the config file over Dokploy CLI config when env vars are absent', () => {
    configureConfigSources({
      configFileContent: JSON.stringify({
        url: 'https://file.example.com/api',
        apiKey: 'file-key',
      }),
      cliConfigContent: JSON.stringify({
        url: 'https://cli.example.com',
        token: 'cli-key',
      }),
    })

    expect(resolveConfig()).toEqual({
      url: 'https://file.example.com/api/trpc',
      apiKey: 'file-key',
      source: 'config-file',
      timeout: 30_000,
    })
  })

  it('falls back to the config file when env vars are only partially set', () => {
    configureConfigSources({
      configFileContent: JSON.stringify({
        url: 'https://file.example.com/',
        apiKey: 'file-key',
      }),
    })

    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')

    expect(resolveConfig()).toEqual({
      url: 'https://file.example.com/api/trpc',
      apiKey: 'file-key',
      source: 'config-file',
      timeout: 30_000,
    })
  })

  it('falls back to Dokploy CLI config when the config file is missing', () => {
    configureConfigSources({
      cliConfigContent: JSON.stringify({
        url: 'https://cli.example.com/api',
        token: 'cli-key',
      }),
    })

    expect(resolveConfig()).toEqual({
      url: 'https://cli.example.com/api/trpc',
      apiKey: 'cli-key',
      source: 'dokploy-cli',
      timeout: 30_000,
    })
  })

  it('falls back to Dokploy CLI config when the config file contains malformed JSON', () => {
    configureConfigSources({
      configFileContent: '{"url": "https://file.example.com",',
      cliConfigContent: JSON.stringify({
        url: 'https://cli.example.com',
        token: 'cli-key',
      }),
    })

    expect(resolveConfig()).toEqual({
      url: 'https://cli.example.com/api/trpc',
      apiKey: 'cli-key',
      source: 'dokploy-cli',
      timeout: 30_000,
    })
  })

  it('returns null when Dokploy CLI config is malformed and no other source is valid', () => {
    configureConfigSources({
      cliConfigContent: '{"url": "https://cli.example.com",',
    })

    expect(resolveConfig()).toBeNull()
  })

  it('returns null when Dokploy CLI lookup throws and no other source is valid', () => {
    execSyncMock.mockImplementation(() => {
      throw new Error('npm root failed')
    })

    expect(resolveConfig()).toBeNull()
  })

  it('falls back to Dokploy CLI config when the config file schema is invalid', () => {
    configureConfigSources({
      configFileContent: JSON.stringify({
        url: 'https://file.example.com',
      }),
      cliConfigContent: JSON.stringify({
        url: 'https://cli.example.com',
        token: 'cli-key',
      }),
    })

    expect(resolveConfig()).toEqual({
      url: 'https://cli.example.com/api/trpc',
      apiKey: 'cli-key',
      source: 'dokploy-cli',
      timeout: 30_000,
    })
  })

  it('falls back to Dokploy CLI config when reading the config file throws', () => {
    configureConfigSources({
      cliConfigContent: JSON.stringify({
        url: 'https://cli.example.com',
        token: 'cli-key',
      }),
      configFileReadError: new Error('EACCES'),
    })

    expect(resolveConfig()).toEqual({
      url: 'https://cli.example.com/api/trpc',
      apiKey: 'cli-key',
      source: 'dokploy-cli',
      timeout: 30_000,
    })
  })

  it('returns null when env vars are partial and no fallback source is valid', () => {
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')

    expect(resolveConfig()).toBeNull()
  })

  it('uses the default timeout when DOKPLOY_TIMEOUT is missing', () => {
    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')

    expect(resolveConfig()?.timeout).toBe(30_000)
  })

  it('uses the default timeout when DOKPLOY_TIMEOUT is invalid', () => {
    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')
    vi.stubEnv('DOKPLOY_TIMEOUT', 'not-a-number')

    expect(resolveConfig()?.timeout).toBe(30_000)
  })

  it('uses the default timeout when DOKPLOY_TIMEOUT is zero or negative', () => {
    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')
    vi.stubEnv('DOKPLOY_TIMEOUT', '0')

    expect(resolveConfig()?.timeout).toBe(30_000)

    vi.stubEnv('DOKPLOY_TIMEOUT', '-5')
    expect(resolveConfig()?.timeout).toBe(30_000)
  })

  it('respects a positive integer DOKPLOY_TIMEOUT', () => {
    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')
    vi.stubEnv('DOKPLOY_TIMEOUT', '60000')

    expect(resolveConfig()?.timeout).toBe(60_000)
  })
})

describe('validateCredentials', () => {
  it('tries the normalized /api/trpc URL first for a bare panel URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          result: {
            data: {
              json: {
                user: {
                  email: 'user@example.com',
                },
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          result: {
            data: {
              json: 'v0.29.0',
            },
          },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(validateCredentials('https://panel.example.com/', 'test-key')).resolves.toEqual({
      valid: true,
      resolvedUrl: 'https://panel.example.com/api/trpc',
      user: 'user@example.com',
      version: 'v0.29.0',
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://panel.example.com/api/trpc/user.get',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://panel.example.com/api/trpc/settings.getDokployVersion',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('falls back from /api/trpc to /api when validating an /api base URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(404, { message: 'missing' }, 'Not Found'))
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          result: {
            data: {
              json: {
                email: 'user@example.com',
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          result: {
            data: {
              json: {
                version: 'v0.28.8',
              },
            },
          },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(validateCredentials('https://panel.example.com/api', 'test-key')).resolves.toEqual(
      {
        valid: true,
        resolvedUrl: 'https://panel.example.com/api',
        user: 'user@example.com',
        version: 'v0.28.8',
      },
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://panel.example.com/api/trpc/user.get',
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://panel.example.com/api/user.get',
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://panel.example.com/api/settings.getDokployVersion',
      expect.any(Object),
    )
  })

  it('accepts an already normalized /api/trpc URL without probing fallback paths', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          result: {
            data: {
              json: {
                email: 'user@example.com',
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          result: {
            data: {
              json: {
                version: 'v0.31.0',
              },
            },
          },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      validateCredentials('https://panel.example.com/api/trpc', 'test-key'),
    ).resolves.toEqual({
      valid: true,
      resolvedUrl: 'https://panel.example.com/api/trpc',
      user: 'user@example.com',
      version: 'v0.31.0',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://panel.example.com/api/trpc/user.get',
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://panel.example.com/api/trpc/settings.getDokployVersion',
      expect.any(Object),
    )
  })

  it('stops after an auth error instead of trying every fallback URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(401, { message: 'unauthorized' }, 'Unauthorized'))

    vi.stubGlobal('fetch', fetchMock)

    await expect(validateCredentials('https://panel.example.com', 'bad-key')).resolves.toEqual({
      valid: false,
      error: 'Invalid API key. Check your key in Dokploy Settings > Profile > API/CLI.',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.com/api/trpc/user.get',
      expect.any(Object),
    )
  })

  it('returns generic API errors for unexpected auth response codes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(500, { message: 'boom' }, 'Server Error'))

    vi.stubGlobal('fetch', fetchMock)

    await expect(validateCredentials('https://panel.example.com', 'test-key')).resolves.toEqual({
      valid: false,
      error: 'API returned HTTP 500: Server Error',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns a timeout error when the Dokploy server does not respond', async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      Object.assign(new Error('aborted'), {
        name: 'AbortError',
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(validateCredentials('https://panel.example.com', 'test-key')).resolves.toEqual({
      valid: false,
      error:
        'Could not connect to Dokploy at https://panel.example.com. Ensure the URL is correct and the server is running.',
    })
  })

  it('returns a not reachable error when the Dokploy server cannot be contacted', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('socket hang up'))

    vi.stubGlobal('fetch', fetchMock)

    await expect(validateCredentials('https://panel.example.com', 'test-key')).resolves.toEqual({
      valid: false,
      error:
        'Could not connect to Dokploy at https://panel.example.com. Ensure the URL is correct and the server is running.',
    })
  })

  it('treats version lookup failures as non-fatal after auth succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          result: {
            data: {
              json: {
                email: 'user@example.com',
              },
            },
          },
        }),
      )
      .mockRejectedValueOnce(new Error('version probe failed'))

    vi.stubGlobal('fetch', fetchMock)

    await expect(validateCredentials('https://panel.example.com', 'test-key')).resolves.toEqual({
      valid: true,
      resolvedUrl: 'https://panel.example.com/api/trpc',
      user: 'user@example.com',
      version: undefined,
    })
  })
})

describe('saveConfig', () => {
  it('creates the config directory and writes normalized config JSON', () => {
    const filePath = saveConfig({
      url: 'https://panel.example.com/api',
      apiKey: 'test-key',
    })

    expect(mkdirSyncMock).toHaveBeenCalledWith(getConfigDir(), {
      recursive: true,
    })
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      getConfigFilePath(),
      `${JSON.stringify(
        {
          url: 'https://panel.example.com/api',
          apiKey: 'test-key',
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
    expect(filePath).toBe(getConfigFilePath())
  })
})

describe('getConfigDir', () => {
  it('returns a non-empty string', () => {
    const dir = getConfigDir()
    expect(dir).toBeTruthy()
    expect(typeof dir).toBe('string')
  })

  it('ends with dokploy-mcp', () => {
    expect(getConfigDir().endsWith('dokploy-mcp')).toBe(true)
  })
})

describe('getConfigFilePath', () => {
  it('returns a path ending with config.json', () => {
    expect(getConfigFilePath().endsWith('config.json')).toBe(true)
  })

  it('contains the config dir', () => {
    const dir = getConfigDir()
    expect(getConfigFilePath().startsWith(dir)).toBe(true)
  })
})
