import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'

import { dokployCatalog } from '../src/generated/dokploy-catalog.js'
import { createRawModeTools } from '../src/rawmode/tools.js'
import {
  createServer,
  parseEnabledTags,
  parseServerMode,
  resolveServerOptionsFromEnv,
} from '../src/server.js'

async function withClient(server: McpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'rawmode-test-client',
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

describe('raw and hybrid server modes', () => {
  it('parses explicit mode and enabled-tags configuration', () => {
    expect(parseServerMode('RAW')).toBe('raw')
    expect(parseServerMode('hybrid')).toBe('hybrid')
    expect(parseServerMode('invalid')).toBeUndefined()
    expect(parseEnabledTags('project, application , project')).toEqual(['project', 'application'])
    expect(
      resolveServerOptionsFromEnv({
        DOKPLOY_MCP_MODE: 'hybrid',
        DOKPLOY_ENABLED_TAGS: 'project,application',
      }),
    ).toEqual({
      mode: 'hybrid',
      enabledTags: ['project', 'application'],
    })
  })

  it('builds raw mode tools from the generated catalog', () => {
    const tools = createRawModeTools()
    const projectTools = createRawModeTools({ enabledTags: ['project'] })

    expect(tools).toHaveLength(dokployCatalog.endpointCount)
    expect(projectTools).toHaveLength(dokployCatalog.byTag.project.length)
    expect(projectTools.every((tool) => tool.name.startsWith('project.'))).toBe(true)
  })

  it('preserves required inputs in generated raw tool schemas', () => {
    const projectOneTool = createRawModeTools({ enabledTags: ['project'] }).find(
      (tool) => tool.name === 'project.one',
    )

    expect(projectOneTool).toBeDefined()
    expect(projectOneTool?.schema.safeParse({ projectId: 'project-1' }).success).toBe(true)
    expect(projectOneTool?.schema.safeParse({}).success).toBe(false)
  })

  it('exposes generated procedure tools in raw mode', async () => {
    await withClient(createServer({ mode: 'raw', enabledTags: ['project'] }), async (client) => {
      const { tools } = await client.listTools()
      const names = tools.map((tool) => tool.name)

      expect(names).toContain('project.one')
      expect(names).not.toContain('search')
      expect(names).not.toContain('execute')
      expect(names).not.toContain('application.one')
    })
  })

  it('merges codemode and filtered raw tools in hybrid mode', async () => {
    await withClient(createServer({ mode: 'hybrid', enabledTags: ['project'] }), async (client) => {
      const { tools } = await client.listTools()
      const names = tools.map((tool) => tool.name)

      expect(names).toContain('search')
      expect(names).toContain('execute')
      expect(names).toContain('project.one')
      expect(names).not.toContain('application.one')
    })
  })

  it('routes raw tool calls through gateway validation overrides', async () => {
    await withClient(
      createServer({ mode: 'raw', enabledTags: ['application'] }),
      async (client) => {
        const result = await client.callTool({
          name: 'application.one',
          arguments: {
            applicationId: 'app-1',
            includeDeployments: false,
            deploymentLimit: 1,
          },
        })

        expect(result.isError).toBe(true)
        expect(result.content).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.stringContaining(
                'deploymentLimit cannot be used when includeDeployments is false',
              ),
            }),
          ]),
        )
      },
    )
  })
})
