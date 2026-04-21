import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
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

async function withClient(server: McpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'phase4-adversarial-client',
    version: '1.0.0',
  })
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

async function collectTaskMessages(client: Client, argumentsPayload: Record<string, unknown>) {
  const messages = []

  for await (const message of client.experimental.tasks.callToolStream(
    {
      name: 'execute',
      arguments: argumentsPayload,
    },
    CallToolResultSchema,
    {
      task: {},
    },
  )) {
    messages.push(message)
  }

  return messages
}

describe('phase 4 adversarial task coverage', () => {
  it('stores a failed task result when task-based execute code throws inside the sandbox', async () => {
    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          tasks: true,
        },
      }),
      async (client) => {
        const messages = await collectTaskMessages(client, {
          code: 'async () => { throw new Error("sandbox boom") }',
        })
        const created = messages.find((message) => message.type === 'taskCreated')
        const taskId = created?.type === 'taskCreated' ? created.task.taskId : 'missing-task-id'
        const task = await client.experimental.tasks.getTask(taskId)
        const taskResult = await client.experimental.tasks.getTaskResult(
          taskId,
          CallToolResultSchema,
        )

        expect(task.status).toBe('failed')
        expect(taskResult.isError).toBe(true)
        expect(taskResult.structuredContent).toMatchObject({
          error: 'Failed to execute execute',
          details: expect.stringContaining('sandbox boom'),
        })
      },
    )
  })

  it('stores a failed task result when guided deploy execution errors after task creation', async () => {
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
          throw new Error(`deploy boom: ${JSON.stringify(input)}`)
        }

        throw new Error(`Unexpected procedure ${procedure}:${JSON.stringify(input)}`)
      },
    )

    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          tasks: true,
        },
      }),
      async (client) => {
        const messages = await collectTaskMessages(client, {
          workflow: {
            kind: 'deploy-application',
            applicationId: 'app-1',
            intent: 'Apply and fail.',
            action: 'apply',
          },
        })
        const created = messages.find((message) => message.type === 'taskCreated')
        const taskId = created?.type === 'taskCreated' ? created.task.taskId : 'missing-task-id'
        const task = await client.experimental.tasks.getTask(taskId)
        const taskResult = await client.experimental.tasks.getTaskResult(
          taskId,
          CallToolResultSchema,
        )

        expect(task.status).toBe('failed')
        expect(taskResult.isError).toBe(true)
        expect(taskResult.structuredContent).toMatchObject({
          error: 'Failed to execute execute',
          details: expect.stringContaining('deploy boom'),
        })
      },
    )
  })
})
