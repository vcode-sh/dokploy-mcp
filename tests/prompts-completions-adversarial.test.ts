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

import { createCodeModeCompletionProviders } from '../src/mcp/completions/runtime.js'
import {
  renderDeployApplicationPrompt,
  renderRotateDatabasePasswordPreviewPrompt,
} from '../src/mcp/prompts/runtime.js'
import { createServer } from '../src/server.js'

afterEach(() => {
  invokeProcedureMock.mockReset()
})

async function withClient(server: McpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'phase2-adversarial-client',
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

function getTextMessages(result: { messages: { content: { type: string } }[] }) {
  return result.messages
    .filter((message) => message.content.type === 'text')
    .map((message) => ('text' in message.content ? message.content.text : ''))
}

describe('phase 2 adversarial coverage', () => {
  it('only offers passwordType completions when the selected database kind supports them', async () => {
    const completions = createCodeModeCompletionProviders(async () => {
      throw new Error('passwordType completions should not call the backend')
    })

    expect(await completions.passwordType('ro')).toEqual(['root'])
    expect(
      await completions.passwordType('ro', {
        arguments: {
          kind: 'mysql',
        },
      }),
    ).toEqual(['root'])
    expect(
      await completions.passwordType('ro', {
        arguments: {
          kind: 'postgres',
        },
      }),
    ).toEqual([])
  })

  it('fails closed before hitting the backend when passwordType does not apply to the selected kind', async () => {
    const executor = vi.fn(async () => {
      throw new Error('rotate preview executor should not run')
    })

    const result = await renderRotateDatabasePasswordPreviewPrompt(
      {
        kind: 'postgres',
        databaseId: 'pg-1',
        passwordType: 'root',
      },
      executor,
    )

    expect(executor).not.toHaveBeenCalled()
    expect(getTextMessages(result).join('\n')).toContain('not supported for postgres databases')
    expect(getTextMessages(result).join('\n')).toContain('mariadb')
    expect(getTextMessages(result).join('\n')).toContain('mysql')
  })

  it('uses dokploy.call for non-dotted preview procedures and still redacts password fields', async () => {
    const result = await renderRotateDatabasePasswordPreviewPrompt(
      {
        kind: 'mysql',
        databaseId: 'mysql-1',
        passwordType: 'root',
      },
      async () => ({
        kind: 'mysql',
        resourceId: 'mysql-1',
        name: 'Billing DB',
        previewOperation: {
          procedure: 'rotate-password',
          inputTemplate: {
            mysqlId: 'mysql-1',
            type: 'root',
            password: 'secret-value',
          },
        },
      }),
    )

    const promptText = getTextMessages(result).join('\n')
    expect(promptText).toContain('dokploy.call("rotate-password"')
    expect(promptText).toContain('"type": "root"')
    expect(promptText).toContain('<REDACTED>')
    expect(promptText).not.toContain('secret-value')
  })

  it('treats plain not-found errors as stale-target guidance instead of opaque prompt failures', async () => {
    const result = await renderDeployApplicationPrompt(
      {
        applicationId: 'app-stale',
      },
      async () => {
        throw new Error('Application app-stale not found in cached snapshot')
      },
    )

    expect(getTextMessages(result)[0]).toContain('could not be resolved')
    expect(getTextMessages(result)[0]).not.toContain(
      'could not render bounded prompt context automatically',
    )
    expect(getTextMessages(result)[1]).toContain('application.search')
  })

  it('serves passwordType prompt completions over the protocol only for supported kinds', async () => {
    await withClient(
      createServer({
        mode: 'codemode',
        capabilityFlags: {
          prompts: true,
          completions: true,
        },
      }),
      async (client) => {
        const mysqlCompletion = await client.complete({
          ref: {
            type: 'ref/prompt',
            name: 'rotate-database-password-preview',
          },
          argument: {
            name: 'passwordType',
            value: 'ro',
          },
          context: {
            arguments: {
              kind: 'mysql',
            },
          },
        })
        const postgresCompletion = await client.complete({
          ref: {
            type: 'ref/prompt',
            name: 'rotate-database-password-preview',
          },
          argument: {
            name: 'passwordType',
            value: 'ro',
          },
          context: {
            arguments: {
              kind: 'postgres',
            },
          },
        })

        expect(mysqlCompletion.completion.values).toEqual(['root'])
        expect(postgresCompletion.completion.values).toEqual([])
      },
    )
  })

  it('renders bounded guidance over the protocol for unsupported kind and passwordType combinations', async () => {
    invokeProcedureMock.mockImplementation(async () => {
      throw new Error('gateway should not be called for unsupported passwordType combinations')
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
          name: 'rotate-database-password-preview',
          arguments: {
            kind: 'postgres',
            databaseId: 'pg-1',
            passwordType: 'root',
          },
        })

        expect(invokeProcedureMock).not.toHaveBeenCalled()
        expect(getTextMessages(result)[0]).toContain('not supported for postgres databases')
        expect(getTextMessages(result)[1]).toContain('Rerun this prompt without `passwordType`')
      },
    )
  })
})
