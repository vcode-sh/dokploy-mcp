import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'

import { createCodeModeServer } from '../src/codemode/server-codemode.js'
import { codeModeTools } from '../src/codemode/tools/index.js'
import { createServer } from '../src/server.js'

async function withClient(server: McpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'protocol-test-client',
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

async function inspectSurface(server: McpServer) {
  let surface:
    | {
        tools: string[]
        capabilityKeys: string[]
      }
    | undefined

  await withClient(server, async (client) => {
    const { tools } = await client.listTools()
    surface = {
      tools: tools.map((tool) => tool.name),
      capabilityKeys: Object.keys(
        (client.getServerCapabilities() ?? {}) as Record<string, unknown>,
      ).sort(),
    }
  })

  return surface
}

describe('protocol surfaces', () => {
  it('codemode surface is intentionally tiny', () => {
    expect(codeModeTools.map((tool) => tool.name)).toEqual(['search', 'execute'])
  })

  it('creates the codemode server instance', () => {
    const codeModeServer = createCodeModeServer()

    expect(codeModeServer).toBeDefined()
  })

  it('keeps default createServer() on the codemode surface', async () => {
    const server = createServer()

    await withClient(server, async (client) => {
      const { tools } = await client.listTools()
      expect(tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
    })
  })

  it('keeps explicit codemode plumbing backward compatible with direct codemode registration', async () => {
    const defaultSurface = await inspectSurface(createServer())
    const explicitSurface = await inspectSurface(createServer({ mode: 'codemode' }))
    const directSurface = await inspectSurface(createCodeModeServer())

    expect(defaultSurface).toEqual({
      tools: ['search', 'execute'],
      capabilityKeys: ['tools'],
    })
    expect(explicitSurface).toEqual(defaultSurface)
    expect(directSurface).toEqual(defaultSurface)
  })

  it('does not advertise resources, resource templates, or prompts by default', async () => {
    await withClient(createServer(), async (client) => {
      await expect(client.listResources()).rejects.toThrow()
      await expect(client.listResourceTemplates()).rejects.toThrow()
      await expect(client.listPrompts()).rejects.toThrow()
    })
  })

  it('adds resource capability registration without changing the default codemode tools', async () => {
    const surface = await inspectSurface(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          resources: true,
        },
      }),
    )

    expect(surface).toEqual({
      tools: ['search', 'execute'],
      capabilityKeys: ['resources', 'tools'],
    })
  })

  it('adds prompt and completion capabilities without changing the default codemode tools', async () => {
    const surface = await inspectSurface(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
          completions: true,
        },
      }),
    )

    expect(surface).toEqual({
      tools: ['search', 'execute'],
      capabilityKeys: ['completions', 'prompts', 'tools'],
    })
  })

  it('adds the tasks capability without changing the default codemode tools', async () => {
    const surface = await inspectSurface(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          tasks: true,
        },
      }),
    )

    expect(surface).toEqual({
      tools: ['search', 'execute'],
      capabilityKeys: ['tasks', 'tools'],
    })
  })
})
