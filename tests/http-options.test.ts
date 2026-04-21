import { afterEach, describe, expect, it } from 'vitest'

import { getHealthPayload, resolveHttpOptions } from '../src/http/options.js'

const ORIGINAL_ENV = { ...process.env }

function omitEnv(
  env: NodeJS.ProcessEnv,
  ...keys: Array<
    | 'DOKPLOY_MCP_HTTP_HOST'
    | 'DOKPLOY_MCP_HTTP_PORT'
    | 'DOKPLOY_MCP_HTTP_PATH'
    | 'DOKPLOY_MCP_HEALTH_PATH'
    | 'DOKPLOY_MCP_CAPABILITIES'
  >
) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !keys.includes(key as (typeof keys)[number])),
  )
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('http options', () => {
  it('uses defaults when explicit options and env vars are absent', () => {
    process.env = omitEnv(
      ORIGINAL_ENV,
      'DOKPLOY_MCP_HTTP_HOST',
      'DOKPLOY_MCP_HTTP_PORT',
      'DOKPLOY_MCP_HTTP_PATH',
      'DOKPLOY_MCP_HEALTH_PATH',
      'DOKPLOY_MCP_CAPABILITIES',
    )

    expect(resolveHttpOptions()).toEqual({
      mode: 'codemode',
      enabledTags: undefined,
      capabilityFlags: undefined,
      host: '127.0.0.1',
      port: 3000,
      mcpPath: '/mcp',
      healthPath: '/health',
    })
  })

  it('normalizes env-derived paths and capability flags', () => {
    process.env.DOKPLOY_MCP_HTTP_HOST = '0.0.0.0'
    process.env.DOKPLOY_MCP_HTTP_PORT = '8088'
    process.env.DOKPLOY_MCP_HTTP_PATH = 'rpc'
    process.env.DOKPLOY_MCP_HEALTH_PATH = 'status'
    process.env.DOKPLOY_MCP_CAPABILITIES = 'tasks,resources,prompts,completions,invalid'

    expect(resolveHttpOptions({ mode: 'hybrid', enabledTags: ['project'] })).toEqual({
      mode: 'hybrid',
      enabledTags: ['project'],
      capabilityFlags: {
        resources: true,
        prompts: true,
        completions: true,
      },
      host: '0.0.0.0',
      port: 8088,
      mcpPath: '/rpc',
      healthPath: '/status',
    })
  })

  it('prefers explicit options over env vars and ignores invalid env ports', () => {
    process.env.DOKPLOY_MCP_HTTP_HOST = '0.0.0.0'
    process.env.DOKPLOY_MCP_HTTP_PORT = 'oops'
    process.env.DOKPLOY_MCP_HTTP_PATH = '/from-env'
    process.env.DOKPLOY_MCP_HEALTH_PATH = '/env-health'
    process.env.DOKPLOY_MCP_CAPABILITIES = 'resources'

    expect(
      resolveHttpOptions({
        host: '127.0.0.2',
        port: 4000,
        mcpPath: 'explicit-mcp',
        healthPath: 'explicit-health',
        capabilityFlags: { resources: true },
      }),
    ).toEqual({
      mode: 'codemode',
      enabledTags: undefined,
      capabilityFlags: { resources: true },
      host: '127.0.0.2',
      port: 4000,
      mcpPath: '/explicit-mcp',
      healthPath: '/explicit-health',
    })
  })

  it('serializes health payload with sorted capability flags', () => {
    expect(
      getHealthPayload(
        resolveHttpOptions({
          mode: 'raw',
          enabledTags: ['server', 'project'],
          capabilityFlags: {
            resources: true,
            prompts: true,
            completions: true,
          },
          mcpPath: '/rpc',
          healthPath: '/livez',
        }),
      ),
    ).toEqual({
      ok: true,
      transport: 'http',
      mode: 'raw',
      enabledTags: ['server', 'project'],
      capabilityFlags: ['completions', 'prompts', 'resources'],
      mcpPath: '/rpc',
      healthPath: '/livez',
    })
  })
})
