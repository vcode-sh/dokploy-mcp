import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  CallToolResultSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
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
    await client.listTools()
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

async function drainTaskStream<T>(stream: AsyncGenerator<T, void, void>) {
  const messages: T[] = []

  for await (const message of stream) {
    messages.push(message)
  }

  return messages
}

describe('phase 4 execute task integration', () => {
  it('runs execute code as a task and exposes list/get/result lifecycle endpoints', async () => {
    const client = new Client({
      name: 'phase4-task-client',
      version: '1.0.0',
    })

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          tasks: true,
        },
      }),
      client,
      async (connectedClient) => {
        const stream = connectedClient.experimental.tasks.callToolStream(
          {
            name: 'execute',
            arguments: {
              code: 'await helpers.sleep(25); return { ok: true, mode: "task" }',
            },
          },
          CallToolResultSchema,
          {
            task: {},
          },
        )
        const firstMessage = await stream.next()

        expect(firstMessage.done).toBe(false)
        expect(firstMessage.value?.type).toBe('taskCreated')

        const taskId =
          firstMessage.value?.type === 'taskCreated'
            ? firstMessage.value.task.taskId
            : 'missing-task-id'
        const listed = await connectedClient.experimental.tasks.listTasks()
        const currentTask = await connectedClient.experimental.tasks.getTask(taskId)
        const rest = await drainTaskStream(stream)
        const resultMessage = rest.find((message) => message.type === 'result')
        const fetchedResult = await connectedClient.experimental.tasks.getTaskResult(
          taskId,
          CallToolResultSchema,
        )

        expect(listed.tasks).toEqual(expect.arrayContaining([expect.objectContaining({ taskId })]))
        expect(['working', 'completed']).toContain(currentTask.status)
        expect(rest.some((message) => message.type === 'taskStatus')).toBe(true)
        expect(resultMessage).toMatchObject({
          type: 'result',
          result: {
            structuredContent: {
              result: {
                ok: true,
                mode: 'task',
              },
              logs: [],
              calls: [],
            },
          },
        })
        expect(fetchedResult).toMatchObject({
          structuredContent: {
            result: {
              ok: true,
              mode: 'task',
            },
          },
        })
      },
    )
  })

  it('cancels a long-running execute code task and keeps a fetchable cancelled result', async () => {
    const client = new Client({
      name: 'phase4-cancel-client',
      version: '1.0.0',
    })

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          tasks: true,
        },
      }),
      client,
      async (connectedClient) => {
        const stream = connectedClient.experimental.tasks.callToolStream(
          {
            name: 'execute',
            arguments: {
              code: 'await helpers.sleep(5000); return { ok: true }',
            },
          },
          CallToolResultSchema,
          {
            task: {},
          },
        )
        const firstMessage = await stream.next()
        const taskId =
          firstMessage.value?.type === 'taskCreated'
            ? firstMessage.value.task.taskId
            : 'missing-task-id'

        const cancelled = await connectedClient.experimental.tasks.cancelTask(taskId)
        const remainingMessages = await drainTaskStream(stream)
        const task = await connectedClient.experimental.tasks.getTask(taskId)
        const taskResult = await connectedClient.experimental.tasks.getTaskResult(
          taskId,
          CallToolResultSchema,
        )

        expect(cancelled.status).toBe('cancelled')
        expect(task.status).toBe('cancelled')
        expect(
          remainingMessages.some(
            (message) => message.type === 'error' || message.type === 'taskStatus',
          ),
        ).toBe(true)
        expect(taskResult.isError).toBe(true)
        expect(taskResult.structuredContent).toMatchObject({
          error: 'Task cancelled',
        })
      },
    )
  })

  it('waits for rollout polling when the guided deploy workflow requests it', async () => {
    invokeProcedureMock.mockImplementation(
      async (procedure: string, input: Record<string, unknown>) => {
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
            deployments: [{ deploymentId: 'dep-1', status: 'done' }],
          })
        }

        if (procedure === 'application.deploy') {
          return createGatewayResult(procedure, {
            deploymentId: 'dep-2',
            applicationId: 'app-1',
            status: 'queued',
          })
        }

        if (procedure === 'deployment.allByType') {
          const callIndex = invokeProcedureMock.mock.calls.filter(
            ([name]) => name === 'deployment.allByType',
          ).length

          return createGatewayResult(procedure, {
            items: [
              {
                deploymentId: 'dep-2',
                status: callIndex >= 2 ? 'done' : 'queued',
              },
            ],
            total: 1,
          })
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    const client = new Client({
      name: 'phase4-guided-task-client',
      version: '1.0.0',
    })

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          tasks: true,
        },
      }),
      client,
      async (connectedClient) => {
        const result = await connectedClient.callTool({
          name: 'execute',
          arguments: {
            workflow: {
              kind: 'deploy-application',
              applicationId: 'app-1',
              intent: 'Deploy with rollout polling.',
              action: 'apply',
              rollout: {
                includeProjectLogs: false,
                tailLines: 0,
                waitForRollout: true,
                pollIntervalMs: 250,
                maxPolls: 3,
              },
            },
          },
        })
        const rolloutPollCalls = invokeProcedureMock.mock.calls.filter(
          ([procedure]) => procedure === 'deployment.allByType',
        ).length

        expect(rolloutPollCalls).toBeGreaterThanOrEqual(2)
        expect(result.structuredContent).toMatchObject({
          result: {
            outcome: 'applied',
            rolloutStatus: {
              status: 'completed',
            },
            deployment: {
              deploymentId: 'dep-2',
            },
          },
        })
      },
    )
  })

  it('supports task-enabled deploy workflow preflight with elicitation and sampling before completion', async () => {
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
        name: 'phase4-interactive-task-client',
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
              intent: 'Preview the rollout safely.',
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
        model: 'phase4-test-planner',
        role: 'assistant',
        content: {
          type: 'text',
          text: JSON.stringify({
            summary: 'Preview the Frontend deploy with a bounded safety review.',
            riskLevel: 'medium',
            preflightChecks: ['Review the latest deployment summary.'],
            executionSteps: ['Stay in preview mode and do not mutate Dokploy state.'],
            followUpChecks: ['Inspect the application summary resource link.'],
            notes: ['Task preflight used sampling before task completion.'],
          }),
        },
      }
    })

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          tasks: true,
          sampling: true,
          elicitation: true,
        },
      }),
      client,
      async (connectedClient) => {
        const messages = await drainTaskStream(
          connectedClient.experimental.tasks.callToolStream(
            {
              name: 'execute',
              arguments: {
                workflow: {
                  kind: 'deploy-application',
                },
              },
            },
            CallToolResultSchema,
            {
              task: {},
            },
          ),
        )
        const resultMessage = messages.find((message) => message.type === 'result')

        expect(messages.some((message) => message.type === 'taskCreated')).toBe(true)
        expect(resultMessage).toMatchObject({
          type: 'result',
          result: {
            structuredContent: {
              result: {
                outcome: 'preview',
                planSource: 'sampling',
                resolved: {
                  applicationId: 'app-1',
                  action: 'preview',
                },
              },
            },
          },
        })
        expect(elicitationRequests).toHaveLength(4)
        expect(samplingRequests).toHaveLength(1)
      },
    )
  })
})
