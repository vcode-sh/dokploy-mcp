import { afterEach, describe, expect, it, vi } from 'vitest'

import { getHealthPayload, resolveHttpOptions } from '../src/http/options.js'
import { remoteDokployHeaderInputs } from '../src/http/security.js'

const ORIGINAL_ENV = { ...process.env }

function omitEnv(
  env: NodeJS.ProcessEnv,
  ...keys: Array<
    | 'DOKPLOY_MCP_HTTP_HOST'
    | 'DOKPLOY_MCP_HTTP_PORT'
    | 'DOKPLOY_MCP_HTTP_PATH'
    | 'DOKPLOY_MCP_HEALTH_PATH'
    | 'DOKPLOY_MCP_CAPABILITIES'
    | 'DOKPLOY_MCP_ALLOWED_ORIGINS'
    | 'DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK'
  >
) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !keys.includes(key as (typeof keys)[number])),
  )
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
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
      'DOKPLOY_MCP_ALLOWED_ORIGINS',
      'DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK',
    )

    expect(resolveHttpOptions()).toEqual({
      mode: 'codemode',
      enabledTags: undefined,
      capabilityFlags: undefined,
      host: '127.0.0.1',
      port: 3000,
      mcpPath: '/mcp',
      healthPath: '/health',
      allowedOrigins: [],
      allowConfigFallback: false,
      remoteHeaders: remoteDokployHeaderInputs,
    })
  })

  it('normalizes env-derived paths, capability flags, and remote HTTP settings', () => {
    process.env.DOKPLOY_MCP_HTTP_HOST = '0.0.0.0'
    process.env.DOKPLOY_MCP_HTTP_PORT = '8088'
    process.env.DOKPLOY_MCP_HTTP_PATH = 'rpc'
    process.env.DOKPLOY_MCP_HEALTH_PATH = 'status'
    process.env.DOKPLOY_MCP_CAPABILITIES =
      'tasks,resources,prompts,completions,sampling,elicitation,invalid'
    process.env.DOKPLOY_MCP_ALLOWED_ORIGINS = 'https://app.example.com, https://admin.example.com'
    process.env.DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK = 'true'

    expect(resolveHttpOptions({ mode: 'hybrid', enabledTags: ['project'] })).toEqual({
      mode: 'hybrid',
      enabledTags: ['project'],
      capabilityFlags: {
        tasks: true,
        resources: true,
        prompts: true,
        completions: true,
        sampling: true,
        elicitation: true,
      },
      host: '0.0.0.0',
      port: 8088,
      mcpPath: '/rpc',
      healthPath: '/status',
      allowedOrigins: ['https://app.example.com', 'https://admin.example.com'],
      allowConfigFallback: true,
      remoteHeaders: remoteDokployHeaderInputs,
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
        allowedOrigins: ['https://cursor.example.com'],
        allowConfigFallback: true,
      }),
    ).toEqual({
      mode: 'codemode',
      enabledTags: undefined,
      capabilityFlags: { resources: true },
      host: '127.0.0.2',
      port: 4000,
      mcpPath: '/explicit-mcp',
      healthPath: '/explicit-health',
      allowedOrigins: ['https://cursor.example.com'],
      allowConfigFallback: true,
      remoteHeaders: remoteDokployHeaderInputs,
    })
  })

  it('treats explicit false and invalid remote fallback env values distinctly', () => {
    process.env.DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK = 'false'

    expect(resolveHttpOptions().allowConfigFallback).toBe(false)

    process.env.DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK = 'not-a-boolean'
    expect(resolveHttpOptions().allowConfigFallback).toBe(false)
  })

  it('warns when remote HTTP origins allow every origin', () => {
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(resolveHttpOptions({ allowedOrigins: ['*'] }).allowedOrigins).toEqual(['*'])
    expect(stderr).toHaveBeenCalledWith(
      'dokploy-mcp: DOKPLOY_MCP_ALLOWED_ORIGINS=* reflects any Origin. Use an explicit allowlist for hosted deployments.',
    )
  })

  it('does not warn when remote HTTP origins use an explicit allowlist', () => {
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(
      resolveHttpOptions({
        allowedOrigins: ['https://cursor.example.com', 'https://app.example.com'],
      }).allowedOrigins,
    ).toEqual(['https://cursor.example.com', 'https://app.example.com'])
    expect(stderr).not.toHaveBeenCalled()
  })

  it('serializes health payload with sorted capability flags and remote auth metadata', () => {
    expect(
      getHealthPayload(
        resolveHttpOptions({
          mode: 'raw',
          enabledTags: ['server', 'project'],
          capabilityFlags: {
            tasks: true,
            resources: true,
            prompts: true,
            completions: true,
            sampling: true,
            elicitation: true,
          },
          mcpPath: '/rpc',
          healthPath: '/livez',
          allowedOrigins: ['https://cursor.example.com'],
        }),
      ),
    ).toEqual({
      ok: true,
      transport: 'http',
      mode: 'raw',
      enabledTags: ['server', 'project'],
      capabilityFlags: ['completions', 'elicitation', 'prompts', 'resources', 'sampling', 'tasks'],
      mcpPath: '/rpc',
      healthPath: '/livez',
      remoteAuth: {
        allowConfigFallback: false,
        allowedOrigins: ['https://cursor.example.com'],
        headers: [
          {
            name: 'X-Dokploy-Url',
            isRequired: true,
            isSecret: false,
          },
          {
            name: 'X-Dokploy-Api-Key',
            isRequired: true,
            isSecret: true,
          },
        ],
      },
    })
  })
})
