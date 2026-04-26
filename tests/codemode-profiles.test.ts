import { afterEach, describe, expect, it, vi } from 'vitest'

import { listProfilesTool } from '../src/codemode/tools/list-profiles.js'
import { searchTool } from '../src/codemode/tools/search.js'

afterEach(() => {
  vi.unstubAllEnvs()
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
    expect(JSON.stringify(result.structuredContent)).not.toContain('secret')
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
    expect(JSON.stringify(result.structuredContent)).not.toContain('secret')
  })
})
