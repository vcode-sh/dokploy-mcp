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
})
