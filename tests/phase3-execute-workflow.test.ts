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

describe('phase 3 execute workflow integration', () => {
  it('elicits missing deploy inputs and uses sampling to build a bounded preview plan', async () => {
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        if (procedure === 'application.search') {
          expect(input).toMatchObject({
            limit: 8,
            q: 'front',
          })

          return createGatewayResult(procedure, {
            items: [
              {
                applicationId: 'app-1',
                name: 'Frontend',
                appName: 'frontend',
                description: 'Primary storefront',
              },
              {
                applicationId: 'app-2',
                name: 'Frontend Canary',
                appName: 'frontend-canary',
                description: 'Canary storefront',
              },
            ],
          })
        }

        if (procedure === 'application.one') {
          expect(input).toMatchObject({
            applicationId: 'app-1',
            deploymentLimit: 1,
          })

          return createGatewayResult(procedure, {
            applicationId: 'app-1',
            name: 'Frontend',
            appName: 'frontend',
            applicationStatus: 'running',
            projectId: 'project-1',
            environmentId: 'env-1',
            serverId: 'server-1',
            deployments: [
              {
                deploymentId: 'dep-1',
                status: 'done',
              },
            ],
          })
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    const client = new Client(
      {
        name: 'phase3-interactive-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          sampling: {},
          elicitation: {
            form: {},
          },
        },
      },
    )
    const elicitationRequests: Array<Record<string, unknown>> = []
    const samplingRequests: Array<Record<string, unknown>> = []

    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      elicitationRequests.push(request.params as Record<string, unknown>)
      switch (elicitationRequests.length) {
        case 1:
          return {
            action: 'accept',
            content: {
              applicationQuery: 'front',
            },
          }
        case 2:
          return {
            action: 'accept',
            content: {
              applicationId: 'app-1',
            },
          }
        case 3:
          return {
            action: 'accept',
            content: {
              intent: 'Deploy a production hotfix safely.',
            },
          }
        case 4:
          return {
            action: 'accept',
            content: {
              action: 'preview',
            },
          }
        default:
          return {
            action: 'cancel',
          }
      }
    })
    client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
      samplingRequests.push(request.params as Record<string, unknown>)
      return {
        model: 'phase3-test-planner',
        role: 'assistant',
        content: {
          type: 'text',
          text: JSON.stringify({
            summary: 'Preview the Frontend deploy with a bounded safety review.',
            riskLevel: 'medium',
            preflightChecks: ['Review the latest deployment summary.'],
            executionSteps: ['Stay in preview mode and do not mutate Dokploy state.'],
            followUpChecks: ['Inspect the application summary resource link.'],
            notes: ['Hotfix intent captured from elicitation.'],
          }),
        },
      }
    })

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          sampling: true,
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
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
          calls: Array<Record<string, unknown>>
          resourceLinks: Array<Record<string, unknown>>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          mode: 'workflow',
          workflow: 'deploy-application',
          outcome: 'preview',
          planSource: 'sampling',
          resolved: {
            applicationId: 'app-1',
            action: 'preview',
            intent: 'Deploy a production hotfix safely.',
          },
        })
        expect(structured.calls).toHaveLength(2)
        expect(structured.resourceLinks).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              uri: 'dokploy://application/app-1/summary',
            }),
          ]),
        )
        expect(elicitationRequests).toHaveLength(4)
        expect(elicitationRequests[0]?.requestedSchema).toMatchObject({
          properties: {
            applicationQuery: expect.any(Object),
          },
        })
        expect(elicitationRequests[1]?.requestedSchema).toMatchObject({
          properties: {
            applicationId: {
              oneOf: expect.arrayContaining([
                expect.objectContaining({
                  const: 'app-1',
                }),
                expect.objectContaining({
                  const: 'app-2',
                }),
              ]),
            },
          },
        })
        expect(samplingRequests).toHaveLength(1)
        expect(JSON.stringify(samplingRequests[0])).toContain('Workflow kind: deploy-application')
      },
    )
  })

  it('keeps a safe fallback path when the client does not support sampling or elicitation', async () => {
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

        if (procedure === 'application.deploy') {
          expect(input).toEqual({
            applicationId: 'app-1',
            title: 'Hotfix',
          })

          return createGatewayResult(procedure, {
            deploymentId: 'dep-2',
            applicationId: 'app-1',
            projectId: 'project-1',
            serverId: 'server-1',
            status: 'queued',
          })
        }

        if (procedure === 'project.one') {
          return createGatewayResult(procedure, {
            projectId: 'project-1',
            name: 'Main',
            environments: [
              {
                environmentId: 'env-1',
                name: 'Production',
                applications: [{ applicationId: 'app-1', name: 'Frontend' }],
              },
            ],
          })
        }

        if (procedure === 'application.readLogs') {
          expect(input).toMatchObject({
            applicationId: 'app-1',
            tail: 20,
          })

          return createGatewayResult(procedure, {
            lines: ['deployment queued'],
            truncated: false,
          })
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    const client = new Client({
      name: 'phase3-fallback-client',
      version: '1.0.0',
    })

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          sampling: true,
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
              intent: 'Ship a hotfix.',
              action: 'apply',
              title: 'Hotfix',
              rollout: {
                includeProjectLogs: true,
                tailLines: 20,
              },
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
          calls: Array<Record<string, unknown>>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'applied',
          planSource: 'fallback',
          resolved: {
            applicationId: 'app-1',
            action: 'apply',
            intent: 'Ship a hotfix.',
            title: 'Hotfix',
            rollout: {
              includeProjectLogs: true,
              tailLines: 20,
            },
          },
          deployment: {
            deploymentId: 'dep-2',
            status: 'queued',
          },
          logsPreview: {
            projectId: 'project-1',
            total: 1,
          },
        })
        expect(structured.calls.map((entry) => entry.procedure)).toEqual([
          'application.one',
          'application.deploy',
          'project.one',
          'application.readLogs',
        ])
      },
    )
  })

  it('uses URL elicitation for out-of-band approval instead of applying immediately', async () => {
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
        name: 'phase3-url-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          elicitation: {
            url: {},
          },
        },
      },
    )
    const elicitationRequests: Array<Record<string, unknown>> = []

    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      elicitationRequests.push(request.params as Record<string, unknown>)
      return {
        action: 'accept',
      }
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
              intent: 'Deploy after external approval.',
              action: 'apply',
              approvalUrl: 'https://example.com/approve',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
          calls: Array<Record<string, unknown>>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'approval-required',
          resolved: {
            applicationId: 'app-1',
            action: 'apply',
            approvalUrl: 'https://example.com/approve',
          },
          approval: {
            status: 'accepted',
            approvalUrl: 'https://example.com/approve',
          },
        })
        expect(structured.calls.map((entry) => entry.procedure)).toEqual(['application.one'])
        expect(elicitationRequests).toHaveLength(1)
        expect(elicitationRequests[0]).toMatchObject({
          mode: 'url',
          url: 'https://example.com/approve',
        })
      },
    )
  })

  it('returns needs-input guidance when neither a target ID nor elicitation support is available', async () => {
    const client = new Client({
      name: 'phase3-needs-input-client',
      version: '1.0.0',
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
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'needs-input',
          guidance: expect.arrayContaining([expect.stringContaining('workflow.applicationId')]),
        })
        expect(invokeProcedureMock).not.toHaveBeenCalled()
      },
    )
  })

  it('returns bounded candidate guidance when multiple applications match but form elicitation is unavailable', async () => {
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        if (procedure === 'application.search') {
          return createGatewayResult(procedure, {
            items: [
              {
                applicationId: 'app-1',
                name: 'Frontend',
                description: 'Primary storefront',
              },
              {
                applicationId: 'app-2',
                name: 'Frontend Canary',
                description: 'Canary storefront',
              },
            ],
          })
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    const client = new Client({
      name: 'phase3-candidates-client',
      version: '1.0.0',
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
              applicationQuery: 'front',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'needs-input',
          candidates: [
            expect.objectContaining({ applicationId: 'app-1' }),
            expect.objectContaining({ applicationId: 'app-2' }),
          ],
        })
      },
    )
  })

  it('auto-resolves a single query match and falls back to the default deployment intent', async () => {
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
        if (procedure === 'application.search') {
          return createGatewayResult(procedure, {
            items: [
              {
                applicationId: 'app-1',
                name: 'Frontend',
                description: 'Primary storefront',
              },
            ],
          })
        }

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

    const client = new Client({
      name: 'phase3-single-match-client',
      version: '1.0.0',
    })

    await withClient(
      createServer({
        mode: 'codemode',
      }),
      client,
      async (connectedClient) => {
        const response = await connectedClient.callTool({
          name: 'execute',
          arguments: {
            workflow: {
              kind: 'deploy-application',
              applicationQuery: 'front',
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
          resolved: {
            applicationId: 'app-1',
            intent: 'Deploy Frontend safely.',
          },
        })
      },
    )
  })

  it('turns search failures into bounded needs-input guidance instead of surfacing a raw exception', async () => {
    invokeProcedureMock.mockImplementation(async () => {
      throw new Error('search backend unavailable')
    })

    const client = new Client({
      name: 'phase3-search-error-client',
      version: '1.0.0',
    })

    await withClient(
      createServer({
        mode: 'codemode',
      }),
      client,
      async (connectedClient) => {
        const response = await connectedClient.callTool({
          name: 'execute',
          arguments: {
            workflow: {
              kind: 'deploy-application',
              applicationQuery: 'front',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'needs-input',
          message: expect.stringContaining('could not search for applications automatically'),
        })
      },
    )
  })

  it('returns cancelled when the user declines the preview-vs-apply choice', async () => {
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
        name: 'phase3-cancelled-client',
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

    client.setRequestHandler(ElicitRequestSchema, async () => ({
      action: 'decline',
    }))

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
              intent: 'Choose execution mode.',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'cancelled',
        })
      },
    )
  })

  it('turns a stale applicationId into bounded needs-input guidance', async () => {
    invokeProcedureMock.mockImplementation(async () => {
      throw new Error('Application app-stale not found')
    })

    const client = new Client({
      name: 'phase3-stale-id-client',
      version: '1.0.0',
    })

    await withClient(
      createServer({
        mode: 'codemode',
      }),
      client,
      async (connectedClient) => {
        const response = await connectedClient.callTool({
          name: 'execute',
          arguments: {
            workflow: {
              kind: 'deploy-application',
              applicationId: 'app-stale',
              intent: 'Preview a stale target.',
              action: 'preview',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'needs-input',
          message: expect.stringContaining('could not be resolved'),
        })
      },
    )
  })

  it('elicits rollout options for apply workflows when they were not supplied up front', async () => {
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

        if (procedure === 'application.deploy') {
          return createGatewayResult(procedure, {
            deploymentId: 'dep-2',
            applicationId: 'app-1',
            projectId: 'project-1',
            serverId: 'server-1',
            status: 'queued',
          })
        }

        if (procedure === 'project.one') {
          return createGatewayResult(procedure, {
            projectId: 'project-1',
            name: 'Main',
            environments: [
              {
                environmentId: 'env-1',
                name: 'Production',
                applications: [{ applicationId: 'app-1', name: 'Frontend' }],
              },
            ],
          })
        }

        if (procedure === 'application.readLogs') {
          expect(input).toMatchObject({
            applicationId: 'app-1',
            tail: 30,
          })

          return createGatewayResult(procedure, {
            lines: ['deploy complete'],
            truncated: false,
          })
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    const client = new Client(
      {
        name: 'phase3-rollout-client',
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

    client.setRequestHandler(ElicitRequestSchema, async () => ({
      action: 'accept',
      content: {
        includeProjectLogs: true,
        tailLines: 30,
      },
    }))

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
              intent: 'Apply with elicited rollout options.',
              action: 'apply',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'applied',
          resolved: {
            rollout: {
              includeProjectLogs: true,
              tailLines: 30,
            },
          },
          logsPreview: {
            total: 1,
          },
        })
      },
    )
  })

  it('keeps the deploy result even when bounded rollout log collection fails', async () => {
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

        if (procedure === 'application.deploy') {
          return createGatewayResult(procedure, {
            deploymentId: 'dep-2',
            applicationId: 'app-1',
            projectId: 'project-1',
            status: 'queued',
          })
        }

        if (procedure === 'project.one') {
          return createGatewayResult(procedure, {
            projectId: 'project-1',
            name: 'Main',
            environments: [
              {
                environmentId: 'env-1',
                name: 'Production',
                applications: [{ applicationId: 'app-1', name: 'Frontend' }],
              },
            ],
          })
        }

        if (procedure === 'application.readLogs') {
          throw new Error('logs unavailable')
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    const client = new Client({
      name: 'phase3-logs-failure-client',
      version: '1.0.0',
    })

    await withClient(
      createServer({
        mode: 'codemode',
      }),
      client,
      async (connectedClient) => {
        const response = await connectedClient.callTool({
          name: 'execute',
          arguments: {
            workflow: {
              kind: 'deploy-application',
              applicationId: 'app-1',
              intent: 'Apply while ignoring log fetch failures.',
              action: 'apply',
              rollout: {
                includeProjectLogs: true,
                tailLines: 25,
              },
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'applied',
          deployment: {
            deploymentId: 'dep-2',
          },
        })
        expect(structured.result).not.toHaveProperty('logsPreview')
      },
    )
  })

  it('returns approval-required with an unsupported status when URL elicitation is not negotiated', async () => {
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

    const client = new Client({
      name: 'phase3-url-unsupported-client',
      version: '1.0.0',
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
              intent: 'Deploy after external approval.',
              action: 'apply',
              approvalUrl: 'https://example.com/approve',
            },
          },
        })
        const structured = response.structuredContent as {
          result: Record<string, unknown>
        }

        expect(response.isError).not.toBe(true)
        expect(structured.result).toMatchObject({
          outcome: 'approval-required',
          approval: {
            status: 'unsupported',
          },
        })
      },
    )
  })
})
