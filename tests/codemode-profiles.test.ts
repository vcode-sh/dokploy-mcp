import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

import { listProfilesTool } from '../src/codemode/tools/list-profiles.js'
import { searchTool } from '../src/codemode/tools/search.js'
import { createResolvedConfig, withResolvedConfigOverride } from '../src/config/resolver.js'

beforeEach(() => {
  execSyncMock.mockReset()
  existsSyncMock.mockReset()
  mkdirSyncMock.mockReset()
  readFileSyncMock.mockReset()
  writeFileSyncMock.mockReset()
  execSyncMock.mockImplementation(() => {
    throw new Error('Unexpected Dokploy CLI lookup')
  })
  existsSyncMock.mockReturnValue(false)
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

afterAll(() => {
  vi.doUnmock('node:child_process')
  vi.doUnmock('node:fs')
  vi.resetModules()
})

describe('codemode profile tools', () => {
  it('lists configured profiles without API keys', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'secret-redivo-key',
        },
        mezon: {
          url: 'https://mezon.example.com/api',
          apiKey: 'secret-mezon-key',
        },
      }),
    )

    const result = await listProfilesTool.handler({})

    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toEqual({
      profiles: [
        {
          name: 'mezon',
          url: 'https://mezon.example.com/api/trpc',
          source: 'profiles-json',
        },
        {
          name: 'redivo',
          url: 'https://redivo.example.com/api/trpc',
          source: 'profiles-json',
        },
      ],
    })
    expect(JSON.stringify(result.structuredContent)).not.toContain('secret-redivo-key')
    expect(JSON.stringify(result.structuredContent)).not.toContain('secret-mezon-key')
  })

  it('lists the local default profile before named JSON profiles', async () => {
    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'redivo-key',
        },
      }),
    )

    const result = await listProfilesTool.handler({})

    expect(result.structuredContent).toEqual({
      profiles: [
        {
          name: 'default',
          url: 'https://env.example.com/api/trpc',
          source: 'env',
        },
        {
          name: 'redivo',
          url: 'https://redivo.example.com/api/trpc',
          source: 'profiles-json',
        },
      ],
    })
  })

  it('validates an optional search profile without changing catalog behavior', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        personal: {
          url: 'https://personal.example.com',
          apiKey: 'personal-key',
        },
      }),
    )

    const result = await searchTool.handler({
      profile: 'personal',
      code: 'return catalog.get("project.all")',
    })

    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({
      result: {
        procedure: 'project.all',
      },
    })
  })

  it('returns safe search errors for unknown profiles', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        personal: {
          url: 'https://personal.example.com',
          apiKey: 'secret-personal-key',
        },
        mezon: {
          url: 'https://mezon.example.com',
          apiKey: 'secret-mezon-key',
        },
      }),
    )

    const result = await searchTool.handler({
      profile: 'missing',
      code: 'return catalog.get("project.all")',
    })

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      error: 'Failed to execute search',
      details: 'Unknown Dokploy profile "missing". Available profiles: mezon, personal.',
    })
    expect(JSON.stringify(result.structuredContent)).not.toContain('secret-personal-key')
    expect(JSON.stringify(result.structuredContent)).not.toContain('secret-mezon-key')
  })

  it('does not expose named local profiles inside request-scoped HTTP sessions', async () => {
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        personal: {
          url: 'https://personal.example.com',
          apiKey: 'personal-key',
        },
      }),
    )

    const override = createResolvedConfig(
      'https://remote.example.com',
      'remote-key',
      'http-headers',
      45_000,
    )

    const listResult = await withResolvedConfigOverride(override, () =>
      listProfilesTool.handler({}),
    )
    expect(listResult.structuredContent).toEqual({
      profiles: [
        {
          name: 'default',
          url: 'https://remote.example.com/api/trpc',
          source: 'http-headers',
        },
      ],
    })

    const searchResult = await withResolvedConfigOverride(override, () =>
      searchTool.handler({
        profile: 'personal',
        code: 'return catalog.get("project.all")',
      }),
    )
    expect(searchResult.isError).toBe(true)
    expect(searchResult.structuredContent).toMatchObject({
      error: 'Failed to execute search',
      details:
        'Named Dokploy profiles are unavailable when request-scoped HTTP credentials are active. Omit `profile` to use the bound session credentials.',
    })
  })
})
