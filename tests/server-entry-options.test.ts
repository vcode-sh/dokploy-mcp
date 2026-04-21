import { describe, expect, it } from 'vitest'

import {
  isServerCommand,
  parseFlagValue,
  parseNumberFlag,
  resolveServerOptions,
  resolveTransportFromEnv,
} from '../src/server-entry/options.js'

describe('server entry options', () => {
  it('parses bare env-driven startup options with normalized mode and capabilities', () => {
    expect(
      resolveServerOptions([], {
        DOKPLOY_MCP_MODE: ' RAW ',
        DOKPLOY_ENABLED_TAGS: 'project, application , project',
        DOKPLOY_MCP_CAPABILITIES: 'resources,prompts,completions,invalid',
        DOKPLOY_MCP_TRANSPORT: 'http',
        DOKPLOY_MCP_HTTP_HOST: '0.0.0.0',
        DOKPLOY_MCP_HTTP_PORT: '8080',
        DOKPLOY_MCP_HTTP_PATH: '/rpc',
        DOKPLOY_MCP_HEALTH_PATH: 'healthz',
      }),
    ).toEqual({
      transport: 'http',
      mode: 'raw',
      enabledTags: ['project', 'application'],
      capabilityFlags: {
        resources: true,
        prompts: true,
        completions: true,
      },
      host: '0.0.0.0',
      port: 8080,
      mcpPath: '/rpc',
      healthPath: 'healthz',
    })
  })

  it('parses explicit serve args and normalizes mixed-case mode values', () => {
    expect(
      resolveServerOptions(
        [
          'serve',
          '--mode',
          ' hybrid ',
          '--enabled-tags',
          'project,server',
          '--capabilities',
          'resources,prompts,completions,tasks',
          '--transport',
          'http',
          '--host',
          '127.0.0.1',
          '--port',
          '3001',
          '--mcp-path',
          'mcp-alt',
          '--health-path',
          '/health-alt',
        ],
        {},
      ),
    ).toEqual({
      transport: 'http',
      mode: 'hybrid',
      enabledTags: ['project', 'server'],
      capabilityFlags: {
        resources: true,
        prompts: true,
        completions: true,
      },
      host: '127.0.0.1',
      port: 3001,
      mcpPath: 'mcp-alt',
      healthPath: '/health-alt',
    })
  })

  it('lets transport-specific commands override env transport', () => {
    expect(resolveServerOptions(['serve-http'], { DOKPLOY_MCP_TRANSPORT: 'stdio' })).toMatchObject({
      transport: 'http',
    })
    expect(resolveServerOptions(['serve-stdio'], { DOKPLOY_MCP_TRANSPORT: 'http' })).toMatchObject({
      transport: 'stdio',
    })
  })

  it('returns null for non-server commands', () => {
    expect(resolveServerOptions(['setup'], {})).toBeNull()
  })

  it('rejects unsupported mode strings instead of leaking them downstream', () => {
    expect(resolveServerOptions(['serve', '--mode', 'resources'], {})).toEqual({
      transport: 'stdio',
      mode: undefined,
      enabledTags: undefined,
      host: undefined,
      port: undefined,
      mcpPath: undefined,
      healthPath: undefined,
    })
  })

  it('keeps helper parsing behavior stable for edge cases', () => {
    expect(parseFlagValue(['serve', '--port', '8080'], '--port')).toBe('8080')
    expect(parseFlagValue(['serve'], '--port')).toBeUndefined()
    expect(parseNumberFlag('8080')).toBe(8080)
    expect(parseNumberFlag('not-a-number')).toBeUndefined()
    expect(isServerCommand('serve-http')).toBe(true)
    expect(isServerCommand('setup')).toBe(false)
    expect(resolveTransportFromEnv({ DOKPLOY_MCP_TRANSPORT: 'http' })).toBe('http')
    expect(resolveTransportFromEnv({ DOKPLOY_MCP_TRANSPORT: 'weird' })).toBe('stdio')
  })
})
