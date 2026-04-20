import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { invokeProcedureMock } = vi.hoisted(() => ({
  invokeProcedureMock: vi.fn(),
}))

vi.mock('../src/codemode/gateway/api-gateway.js', () => ({
  invokeProcedure: invokeProcedureMock,
}))

import { createServer } from '../src/server.js'

afterEach(() => {
  invokeProcedureMock.mockReset()
})

async function withClient(server: McpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'resources-client',
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

function createMockResultMap() {
  return new Map<string, unknown>([
    ['project.search:{"limit":10}', { items: [{ projectId: 'project-1', name: 'Alpha' }] }],
    ['application.search:{"limit":25}', { items: [{ applicationId: 'app-1', name: 'Frontend' }] }],
    ['server.all:{}', [{ serverId: 'server-1', name: 'Primary' }]],
    [
      'application.one:{"applicationId":"app-1","select":["applicationId","name","appName","description","applicationStatus","projectId","environmentId","serverId","domains","mounts","watchPaths","deployments"],"deploymentLimit":1}',
      {
        applicationId: 'app-1',
        name: 'Frontend',
        applicationStatus: 'running',
        deployments: [{ deploymentId: 'dep-1', status: 'done' }],
      },
    ],
  ])
}

describe('mcp resources protocol', () => {
  it('snapshots the codemode capability surface with resources enabled', async () => {
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        const key = `${procedure}:${JSON.stringify(input ?? {})}`
        const value = createMockResultMap().get(key)
        if (value === undefined) {
          throw new Error(`Unexpected procedure ${key}`)
        }

        return {
          data: value,
          trace: {
            procedure,
            method: 'GET',
            startedAt: 0,
            finishedAt: 1,
            durationMs: 1,
          },
        }
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          resources: true,
        },
      }),
      async (client) => {
        const capabilityKeys = Object.keys(
          (client.getServerCapabilities() ?? {}) as Record<string, unknown>,
        ).sort()
        const { resourceTemplates } = await client.listResourceTemplates()

        expect({
          capabilityKeys,
          uriTemplates: resourceTemplates.map((entry) => entry.uriTemplate).sort(),
        }).toMatchInlineSnapshot(`
          {
            "capabilityKeys": [
              "resources",
              "tools",
            ],
            "uriTemplates": [
              "dokploy://application/{applicationId}/summary",
              "dokploy://deployment/{deploymentId}/summary",
              "dokploy://project/{projectId}/infrastructure",
              "dokploy://project/{projectId}/logs-overview",
              "dokploy://project/{projectId}/overview",
              "dokploy://server/{serverId}/summary",
            ],
          }
        `)
      },
    )
  })

  it('lists concrete resources from template-backed summaries', async () => {
    const results = createMockResultMap()
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        const key = `${procedure}:${JSON.stringify(input ?? {})}`
        const value = results.get(key)
        if (value === undefined) {
          throw new Error(`Unexpected procedure ${key}`)
        }

        return {
          data: value,
          trace: {
            procedure,
            method: 'GET',
            startedAt: 0,
            finishedAt: 1,
            durationMs: 1,
          },
        }
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          resources: true,
        },
      }),
      async (client) => {
        const { resources } = await client.listResources()
        const uris = resources.map((resource) => resource.uri).sort()

        expect(uris).toEqual([
          'dokploy://application/app-1/summary',
          'dokploy://project/project-1/infrastructure',
          'dokploy://project/project-1/logs-overview',
          'dokploy://project/project-1/overview',
          'dokploy://server/server-1/summary',
        ])
      },
    )
  })

  it('reads application summary resources over the MCP protocol', async () => {
    const results = createMockResultMap()
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        const key = `${procedure}:${JSON.stringify(input ?? {})}`
        const value = results.get(key)
        if (value === undefined) {
          throw new Error(`Unexpected procedure ${key}`)
        }

        return {
          data: value,
          trace: {
            procedure,
            method: 'GET',
            startedAt: 0,
            finishedAt: 1,
            durationMs: 1,
          },
        }
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          resources: true,
        },
      }),
      async (client) => {
        const result = await client.readResource({
          uri: 'dokploy://application/app-1/summary',
        })

        const document = result.contents[0]
        expect(document?.mimeType).toBe('application/json')
        expect(JSON.parse(document?.text ?? '{}')).toMatchObject({
          applicationId: 'app-1',
          name: 'Frontend',
          latestDeployment: {
            deploymentId: 'dep-1',
            status: 'done',
          },
        })
      },
    )
  })
})
