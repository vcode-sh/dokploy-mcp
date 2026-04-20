import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'

import {
  createServer,
  parseCapabilityFlags,
  parseEnabledTags,
  parseServerMode,
  resolveServerOptionsFromEnv,
} from '../src/server.js'

async function withClient(server: McpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'server-test-client',
    version: '1.0.0',
  })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await server.connect(serverTransport)
  await client.connect(clientTransport)

  try {
    await run(client)
  } finally {
    await Promise.allSettled([
      client.close(),
      server.close(),
      clientTransport.close(),
      serverTransport.close(),
    ])
  }
}

function getCapabilityKeys(client: Client) {
  return Object.keys((client.getServerCapabilities() ?? {}) as Record<string, unknown>).sort()
}

describe('createServer', () => {
  it('creates a server instance', () => {
    const server = createServer()
    expect(server).toBeDefined()
  })

  it('parses and normalizes server mode values', () => {
    expect(parseServerMode('codemode')).toBe('codemode')
    expect(parseServerMode(' CodeMode ')).toBe('codemode')
    expect(parseServerMode('RAW')).toBe('raw')
    expect(parseServerMode(' hybrid ')).toBe('hybrid')
    expect(parseServerMode('')).toBeUndefined()
    expect(parseServerMode('   ')).toBeUndefined()
    expect(parseServerMode('resources')).toBeUndefined()
  })

  it('parses and normalizes enabled tag values', () => {
    expect(parseEnabledTags('project, application , project')).toEqual(['project', 'application'])
    expect(parseEnabledTags(' Project , , APPLICATION , project ,  ')).toEqual([
      'project',
      'application',
    ])
    expect(parseEnabledTags('')).toBeUndefined()
    expect(parseEnabledTags(' ,  , ')).toBeUndefined()
  })

  it('parses and normalizes capability flag values', () => {
    expect(parseCapabilityFlags('resources,prompts,resources')).toEqual({
      resources: true,
      prompts: true,
    })
    expect(parseCapabilityFlags(' Resources , COMPLETIONS , invalid , tasks ')).toEqual({
      resources: true,
      completions: true,
      tasks: true,
    })
    expect(parseCapabilityFlags('')).toBeUndefined()
    expect(parseCapabilityFlags(' , invalid , ')).toBeUndefined()
  })

  it('resolves env capability flags through the shared server options parser', () => {
    expect(
      resolveServerOptionsFromEnv({
        DOKPLOY_MCP_MODE: '  CoDeMoDe ',
        DOKPLOY_ENABLED_TAGS: ' project , APPLICATION ',
        DOKPLOY_MCP_CAPABILITIES: ' resources , prompts , tasks ',
      }),
    ).toEqual({
      mode: 'codemode',
      enabledTags: ['project', 'application'],
      capabilityFlags: {
        resources: true,
        prompts: true,
        tasks: true,
      },
    })
  })

  it('keeps explicit codemode mode on the legacy two-tool surface', async () => {
    await withClient(
      createServer({
        mode: 'codemode',
        enabledTags: [' project ', 'application', 'project'],
      }),
      async (client) => {
        const { tools } = await client.listTools()

        expect(tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
        expect(getCapabilityKeys(client)).toEqual(['tools'])
      },
    )
  })

  it('enables resource templates while keeping the default codemode tools unchanged', async () => {
    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          resources: true,
          prompts: true,
          completions: true,
          sampling: true,
          elicitation: true,
          tasks: true,
        },
      }),
      async (client) => {
        const { tools } = await client.listTools()
        const { resourceTemplates } = await client.listResourceTemplates()

        expect(tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
        expect(getCapabilityKeys(client)).toEqual(['resources', 'tools'])
        expect(resourceTemplates.map((entry) => entry.uriTemplate).sort()).toEqual([
          'dokploy://application/{applicationId}/summary',
          'dokploy://deployment/{deploymentId}/summary',
          'dokploy://project/{projectId}/infrastructure',
          'dokploy://project/{projectId}/logs-overview',
          'dokploy://project/{projectId}/overview',
          'dokploy://server/{serverId}/summary',
        ])
        await expect(client.listPrompts()).rejects.toThrow()
      },
    )
  })
})
