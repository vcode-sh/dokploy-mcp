import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
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
    name: 'prompts-client',
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

function createGatewayResult(procedure: string, data: unknown) {
  return {
    data,
    trace: {
      procedure,
      method: 'GET' as const,
      startedAt: 0,
      finishedAt: 1,
      durationMs: 1,
    },
  }
}

function createMockResultMap() {
  return new Map<string, unknown>([
    [
      'application.one:{"applicationId":"app-1","select":["applicationId","name","appName","description","applicationStatus","projectId","environmentId","serverId","domains","mounts","watchPaths","deployments"],"deploymentLimit":1}',
      {
        applicationId: 'app-1',
        name: 'Frontend',
        applicationStatus: 'running',
        projectId: 'project-1',
        environmentId: 'env-1',
        serverId: 'server-1',
        deployments: [{ deploymentId: 'dep-1', status: 'done' }],
      },
    ],
    [
      'application.search:{"limit":25,"q":"front"}',
      { items: [{ applicationId: 'app-1', name: 'Frontend' }] },
    ],
    [
      'postgres.search:{"limit":25,"q":"billing"}',
      { items: [{ postgresId: 'pg-1', name: 'Billing DB' }] },
    ],
    [
      'project.one:{"projectId":"project-1"}',
      {
        projectId: 'project-1',
        name: 'Alpha',
        description: 'Main project',
        environments: [
          {
            environmentId: 'env-1',
            name: 'Production',
            applications: [{ applicationId: 'app-1', name: 'Frontend' }],
            postgres: [{ postgresId: 'pg-1', name: 'Billing DB' }],
          },
        ],
      },
    ],
    [
      'postgres.one:{"postgresId":"pg-1"}',
      {
        postgresId: 'pg-1',
        name: 'Billing DB',
        appName: 'billing-db',
        projectId: 'project-1',
        environmentId: 'env-1',
      },
    ],
    [
      'application.readLogs:{"applicationId":"app-1","tail":25}',
      { lines: ['frontend failed readiness probe'], truncated: false },
    ],
    [
      'postgres.readLogs:{"postgresId":"pg-1","tail":25}',
      { lines: ['db unavailable'], truncated: false },
    ],
  ])
}

function getTextMessages(messages: { content: { type: string } }[]) {
  return messages
    .filter((message) => message.content.type === 'text')
    .map((message) => ('text' in message.content ? message.content.text : ''))
}

function getResourceLinkUris(messages: { content: { type: string } }[]) {
  return messages
    .filter((message) => message.content.type === 'resource_link')
    .map((message) => ('uri' in message.content ? message.content.uri : ''))
}

describe('mcp prompts protocol', () => {
  it('advertises prompts and completions when both staged families are enabled', async () => {
    const results = createMockResultMap()
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        const key = `${procedure}:${JSON.stringify(input ?? {})}`
        const value = results.get(key)
        if (value === undefined) {
          throw new Error(`Unexpected procedure ${key}`)
        }

        return createGatewayResult(procedure, value)
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
          completions: true,
        },
      }),
      async (client) => {
        const capabilityKeys = Object.keys(
          (client.getServerCapabilities() ?? {}) as Record<string, unknown>,
        ).sort()
        const { prompts } = await client.listPrompts()

        expect({
          capabilityKeys,
          promptNames: prompts.map((prompt) => prompt.name).sort(),
        }).toMatchInlineSnapshot(`
          {
            "capabilityKeys": [
              "completions",
              "prompts",
              "tools",
            ],
            "promptNames": [
              "deploy-application",
              "diagnose-deployment",
              "review-project-infrastructure",
              "rotate-database-password-preview",
              "triage-project-logs",
            ],
          }
        `)
      },
    )
  })

  it('renders deploy prompts over the MCP protocol with reusable resource links', async () => {
    const results = createMockResultMap()
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        const key = `${procedure}:${JSON.stringify(input ?? {})}`
        const value = results.get(key)
        if (value === undefined) {
          throw new Error(`Unexpected procedure ${key}`)
        }

        return createGatewayResult(procedure, value)
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
          completions: true,
        },
      }),
      async (client) => {
        const result = await client.getPrompt({
          name: 'deploy-application',
          arguments: {
            applicationId: 'app-1',
          },
        })

        expect(getResourceLinkUris(result.messages)).toEqual([
          'dokploy://application/app-1/summary',
          'dokploy://deployment/dep-1/summary',
        ])
        expect(getTextMessages(result.messages).join('\n')).toContain('dokploy.application.deploy')
        expect(getTextMessages(result.messages).join('\n')).toContain(
          '"applicationStatus": "running"',
        )
      },
    )
  })

  it('validates prompt arguments before rendering', async () => {
    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
          completions: true,
        },
      }),
      async (client) => {
        await expect(
          client.getPrompt({
            name: 'deploy-application',
            arguments: {},
          }),
        ).rejects.toThrow(/applicationId/i)
      },
    )
  })

  it('serves prompt argument completions over completion/complete', async () => {
    const results = createMockResultMap()
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        const key = `${procedure}:${JSON.stringify(input ?? {})}`
        const value = results.get(key)
        if (value === undefined) {
          throw new Error(`Unexpected procedure ${key}`)
        }

        return createGatewayResult(procedure, value)
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
          completions: true,
        },
      }),
      async (client) => {
        const applicationCompletion = await client.complete({
          ref: {
            type: 'ref/prompt',
            name: 'deploy-application',
          },
          argument: {
            name: 'applicationId',
            value: 'front',
          },
        })
        const databaseCompletion = await client.complete({
          ref: {
            type: 'ref/prompt',
            name: 'rotate-database-password-preview',
          },
          argument: {
            name: 'databaseId',
            value: 'billing',
          },
          context: {
            arguments: {
              kind: 'postgres',
            },
          },
        })

        expect(applicationCompletion.completion.values).toEqual(['app-1'])
        expect(databaseCompletion.completion.values).toEqual(['pg-1'])
      },
    )
  })

  it('keeps prompts usable without turning on completions', async () => {
    const results = createMockResultMap()
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        const key = `${procedure}:${JSON.stringify(input ?? {})}`
        const value = results.get(key)
        if (value === undefined) {
          throw new Error(`Unexpected procedure ${key}`)
        }

        return createGatewayResult(procedure, value)
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
        },
      }),
      async (client) => {
        const capabilityKeys = Object.keys(
          (client.getServerCapabilities() ?? {}) as Record<string, unknown>,
        ).sort()
        const { prompts } = await client.listPrompts()

        expect(capabilityKeys).toEqual(['prompts', 'tools'])
        expect(prompts.map((prompt) => prompt.name)).toContain('triage-project-logs')
        await expect(
          client.complete({
            ref: {
              type: 'ref/prompt',
              name: 'deploy-application',
            },
            argument: {
              name: 'applicationId',
              value: 'front',
            },
          }),
        ).rejects.toThrow()
      },
    )
  })

  it('renders review, rotate, and triage prompts over the MCP protocol with coerced string arguments', async () => {
    const results = createMockResultMap()
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        const key = `${procedure}:${JSON.stringify(input ?? {})}`
        const value = results.get(key)
        if (value === undefined) {
          throw new Error(`Unexpected procedure ${key}`)
        }

        return createGatewayResult(procedure, value)
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
          completions: true,
        },
      }),
      async (client) => {
        const reviewPrompt = await client.getPrompt({
          name: 'review-project-infrastructure',
          arguments: {
            projectId: 'project-1',
            includeServerSecurity: 'true',
          },
        })
        const rotatePrompt = await client.getPrompt({
          name: 'rotate-database-password-preview',
          arguments: {
            kind: 'postgres',
            databaseId: 'pg-1',
          },
        })
        const triagePrompt = await client.getPrompt({
          name: 'triage-project-logs',
          arguments: {
            projectId: 'project-1',
            includeDatabases: 'true',
            tail: '25',
          },
        })

        expect(getResourceLinkUris(reviewPrompt.messages)).toEqual([
          'dokploy://project/project-1/infrastructure',
          'dokploy://project/project-1/overview',
        ])
        expect(getTextMessages(reviewPrompt.messages).join('\n')).toContain('server.one')

        expect(getTextMessages(rotatePrompt.messages).join('\n')).toContain(
          'dokploy.postgres.changePassword',
        )
        expect(getTextMessages(rotatePrompt.messages).join('\n')).toContain('<REDACTED>')

        expect(getResourceLinkUris(triagePrompt.messages)).toEqual([
          'dokploy://project/project-1/logs-overview',
          'dokploy://project/project-1/overview',
        ])
        expect(getTextMessages(triagePrompt.messages).join('\n')).toContain('"total": 2')
      },
    )
  })

  it('returns bounded fallback guidance instead of failing when a prompt target is stale', async () => {
    invokeProcedureMock.mockImplementation(async (procedure: string) => {
      if (procedure === 'application.one') {
        throw new McpError(ErrorCode.InvalidParams, 'Application app-stale not found')
      }

      throw new Error(`Unexpected procedure ${procedure}`)
    })

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
          completions: true,
        },
      }),
      async (client) => {
        const result = await client.getPrompt({
          name: 'deploy-application',
          arguments: {
            applicationId: 'app-stale',
          },
        })

        expect(getResourceLinkUris(result.messages)).toEqual([])
        expect(getTextMessages(result.messages)[0]).toContain('could not be resolved')
        expect(getTextMessages(result.messages)[1]).toContain('application.search')
      },
    )
  })
})
