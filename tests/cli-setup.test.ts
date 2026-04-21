import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  confirmMock,
  introMock,
  isCancelMock,
  noteMock,
  outroMock,
  passwordMock,
  spinnerFactoryMock,
  stepMock,
  successMock,
  textMock,
  infoMock,
  errorMock,
} = vi.hoisted(() => {
  const step = vi.fn()
  const success = vi.fn()
  const info = vi.fn()
  const error = vi.fn()
  return {
    confirmMock: vi.fn(),
    introMock: vi.fn(),
    isCancelMock: vi.fn(() => false),
    noteMock: vi.fn(),
    outroMock: vi.fn(),
    passwordMock: vi.fn(),
    spinnerFactoryMock: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    })),
    stepMock: step,
    successMock: success,
    textMock: vi.fn(),
    infoMock: info,
    errorMock: error,
  }
})

const { getConfigFilePathMock, resolveConfigMock, saveConfigMock, validateCredentialsMock } =
  vi.hoisted(() => ({
    getConfigFilePathMock: vi.fn(() => '/mock/config.json'),
    resolveConfigMock: vi.fn(),
    saveConfigMock: vi.fn(() => '/mock/config.json'),
    validateCredentialsMock: vi.fn(),
  }))

vi.mock('@clack/prompts', () => ({
  confirm: confirmMock,
  intro: introMock,
  isCancel: isCancelMock,
  note: noteMock,
  outro: outroMock,
  password: passwordMock,
  spinner: spinnerFactoryMock,
  text: textMock,
  log: {
    step: stepMock,
    success: successMock,
    info: infoMock,
    error: errorMock,
  },
}))

vi.mock('../src/config/resolver.js', () => ({
  resolveConfig: resolveConfigMock,
  saveConfig: saveConfigMock,
  validateCredentials: validateCredentialsMock,
}))

vi.mock('../src/config/types.js', () => ({
  getConfigFilePath: getConfigFilePathMock,
}))

import {
  buildClientSetupSteps,
  buildMcpClientSnippet,
  runSetup,
  toPanelUrl,
} from '../src/cli/setup.js'

beforeEach(() => {
  vi.clearAllMocks()
  isCancelMock.mockReturnValue(false)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cli setup helpers', () => {
  it('converts API paths back to a panel URL for display and saving', () => {
    expect(toPanelUrl('https://panel.example.com/api/trpc')).toBe('https://panel.example.com')
    expect(toPanelUrl('https://panel.example.com/api')).toBe('https://panel.example.com')
    expect(toPanelUrl('https://panel.example.com')).toBe('https://panel.example.com')
  })

  it('builds a snippet without env vars when credentials are saved locally', () => {
    const snippet = JSON.parse(buildMcpClientSnippet({ savedToConfig: true })) as {
      mcpServers: Record<string, Record<string, unknown>>
    }

    expect(snippet.mcpServers.dokploy).toEqual({
      command: 'npx',
      args: ['@vibetools/dokploy-mcp'],
    })
  })

  it('builds a snippet with env vars when credentials are not saved locally', () => {
    const snippet = JSON.parse(
      buildMcpClientSnippet({
        savedToConfig: false,
        url: 'https://panel.example.com',
      }),
    ) as {
      mcpServers: Record<string, Record<string, unknown>>
    }

    expect(snippet.mcpServers.dokploy).toEqual({
      command: 'npx',
      args: ['@vibetools/dokploy-mcp'],
      env: {
        DOKPLOY_URL: 'https://panel.example.com',
        DOKPLOY_API_KEY: 'dokp_...',
      },
    })
  })

  it('returns client-specific guidance for saved and unsaved credential flows', () => {
    expect(buildClientSetupSteps({ savedToConfig: true }).join('\n')).toContain(
      'codex mcp add dokploy -- npx @vibetools/dokploy-mcp',
    )
    expect(buildClientSetupSteps({ savedToConfig: false }).join('\n')).toContain(
      '--env DOKPLOY_URL=https://panel.example.com',
    )
  })
})

describe('runSetup', () => {
  it('does not silently persist env credentials when the user declines local config save', async () => {
    resolveConfigMock.mockReturnValue({
      url: 'https://env.example.com/api/trpc',
      apiKey: 'env-key',
      source: 'env',
      timeout: 30_000,
    })
    confirmMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    validateCredentialsMock.mockResolvedValue({
      valid: true,
      resolvedUrl: 'https://env.example.com/api/trpc',
      user: 'tom@example.com',
      version: 'v0.29.0',
    })

    await runSetup()

    expect(saveConfigMock).not.toHaveBeenCalled()
    expect(noteMock).toHaveBeenCalledWith(
      expect.stringContaining('"DOKPLOY_URL": "https://env.example.com"'),
      'Add to your MCP client config',
    )
    expect(noteMock).toHaveBeenCalledWith(
      expect.stringContaining('"DOKPLOY_API_KEY": "dokp_..."'),
      'Add to your MCP client config',
    )
    expect(stepMock).toHaveBeenCalledWith(
      expect.stringContaining('codex mcp add dokploy --env DOKPLOY_URL=https://panel.example.com'),
    )
  })

  it('retries with newly entered credentials after a failed validation', async () => {
    resolveConfigMock.mockReturnValue(null)
    textMock
      .mockResolvedValueOnce('https://bad.example.com')
      .mockResolvedValueOnce('https://panel.example.com')
    passwordMock.mockResolvedValueOnce('bad-key').mockResolvedValueOnce('good-key')
    confirmMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    validateCredentialsMock
      .mockResolvedValueOnce({
        valid: false,
        error: 'Invalid API key. Check your key in Dokploy Settings > Profile > API/CLI.',
      })
      .mockResolvedValueOnce({
        valid: true,
        resolvedUrl: 'https://panel.example.com/api/trpc',
        user: 'tom@example.com',
      })

    await runSetup()

    expect(validateCredentialsMock).toHaveBeenCalledTimes(2)
    expect(saveConfigMock).toHaveBeenCalledWith({
      url: 'https://panel.example.com',
      apiKey: 'good-key',
    })
    expect(errorMock).toHaveBeenCalledWith(
      'Invalid API key. Check your key in Dokploy Settings > Profile > API/CLI.',
    )
  })
})
