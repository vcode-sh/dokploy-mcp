import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CreateMessageRequestSchema, ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js'
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

async function withClient(
  server: McpServer,
  client: Client,
  run: (client: Client) => Promise<void>,
) {
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

describe('phase 3 adversarial coverage', () => {
  it('falls back to the deterministic planner when sampling returns malformed text', async () => {
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        if (procedure === 'application.one') {
          return createGatewayResult(procedure, {
            applicationId: 'app-1',
            name: 'Frontend',
            appName: 'frontend',
            applicationStatus: 'running',
            projectId: 'project-1',
            environmentId: 'env-1',
            serverId: 'server-1',
            deployments: [{ deploymentId: 'dep-1', status: 'done' }],
          })
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    const client = new Client(
      {
        name: 'phase3-malformed-sampling-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          sampling: {},
        },
      },
    )

    client.setRequestHandler(CreateMessageRequestSchema, async () => ({
      model: 'phase3-malformed-sampling',
      role: 'assistant',
      content: {
        type: 'text',
        text: 'not-json-at-all',
      },
    }))

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          sampling: true,
        },
      }),
      client,
      async (connectedClient) => {
        const response = await connectedClient.callTool({
          name: 'execute',
          arguments: {
            workflow: {
              kind: 'deploy-application',
              applicationId: 'app-1',
              intent: 'Preview with malformed planner output.',
              action: 'preview',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'preview',
          planSource: 'fallback',
        })
      },
    )
  })

  it('fails closed to preview mode when form elicitation returns content that violates the requested schema', async () => {
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        if (procedure === 'application.one') {
          return createGatewayResult(procedure, {
            applicationId: 'app-1',
            name: 'Frontend',
            appName: 'frontend',
            applicationStatus: 'running',
            projectId: 'project-1',
            environmentId: 'env-1',
            serverId: 'server-1',
            deployments: [{ deploymentId: 'dep-1', status: 'done' }],
          })
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    const client = new Client(
      {
        name: 'phase3-invalid-form-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          elicitation: {
            form: {},
          },
        },
      },
    )

    client.setRequestHandler(ElicitRequestSchema, async () => {
      return {
        action: 'accept',
        content: {
          action: ['apply'],
        },
      } as never
    })

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          elicitation: true,
        },
      }),
      client,
      async (connectedClient) => {
        const response = await connectedClient.callTool({
          name: 'execute',
          arguments: {
            workflow: {
              kind: 'deploy-application',
              applicationId: 'app-1',
              intent: 'Action choice should fail closed.',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'preview',
          resolved: {
            action: 'preview',
          },
        })
      },
    )
  })
})
