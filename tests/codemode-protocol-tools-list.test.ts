import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'

import { codeModeTools } from '../src/codemode/tools/index.js'
import { createServer } from '../src/server.js'

async function withClient(server: McpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'tools-list-client',
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

describe('codemode tools/list contract', () => {
  it('exposes only the fixed codemode surface', () => {
    expect(codeModeTools).toHaveLength(3)
    expect(codeModeTools.map((tool) => tool.name)).toEqual(['search', 'execute', 'list_profiles'])
  })

  it('keeps the default MCP tools/list response fixed on the compact Code Mode surface', async () => {
    await withClient(createServer(), async (client) => {
      const { tools } = await client.listTools()
      expect(tools).toHaveLength(3)
      expect(tools.map((tool) => tool.name)).toEqual(['search', 'execute', 'list_profiles'])
    })
  })
})
