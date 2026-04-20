import { once } from 'node:events'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import net from 'node:net'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { afterEach, describe, expect, it } from 'vitest'

import {
  createHttpServer,
  resolveHttpEnabledTags,
  resolveHttpServerMode,
  type StartedHttpServer,
  startHttpServer,
} from '../src/http-server.js'

const startedServers: StartedHttpServer[] = []

afterEach(async () => {
  while (startedServers.length > 0) {
    const handle = startedServers.pop()
    await handle?.close()
  }
})

async function waitFor(milliseconds: number) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function settleWithin<T>(promise: Promise<T>, label: string, timeoutMs = 2_000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

function buildSleepExecuteCode(milliseconds: number, label: string) {
  return [
    `await helpers.sleep(${milliseconds})`,
    `return { label: ${JSON.stringify(label)}, slept: ${milliseconds} }`,
  ].join('\n')
}

async function startTestHttpServer(options: Parameters<typeof startHttpServer>[0]) {
  const handle = await startHttpServer({
    host: '127.0.0.1',
    port: 0,
    ...options,
  })
  startedServers.push(handle)
  return handle
}

async function startCreatedTestHttpServer(options: Parameters<typeof createHttpServer>[0]) {
  const server = createHttpServer({
    host: '127.0.0.1',
    port: 0,
    ...options,
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options?.port ?? 0, options?.host ?? '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected HTTP server to have a TCP address')
  }

  const addressInfo = address as AddressInfo
  const host = addressInfo.address === '::' ? '127.0.0.1' : addressInfo.address
  const baseUrl = `http://${host}:${addressInfo.port}`
  const handle: StartedHttpServer = {
    server,
    url: baseUrl,
    mcpUrl: `${baseUrl}${options?.mcpPath ?? '/mcp'}`,
    healthUrl: `${baseUrl}${options?.healthPath ?? '/health'}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
  }

  startedServers.push(handle)
  return handle
}

async function withHttpClient(handle: StartedHttpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'http-transport-client',
    version: '1.0.0',
  })
  const transport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl))

  await client.connect(transport)

  try {
    await run(client)
  } finally {
    await Promise.allSettled([client.close(), transport.close()])
  }
}

async function withHttpClientTransport(
  handle: StartedHttpServer,
  run: (client: Client, transport: StreamableHTTPClientTransport) => Promise<void>,
) {
  const client = new Client({
    name: 'http-transport-client',
    version: '1.0.0',
  })
  const transport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl))

  await client.connect(transport)

  try {
    await run(client, transport)
  } finally {
    await Promise.allSettled([client.close(), transport.close()])
  }
}

async function createConnectedHttpClient(
  handle: StartedHttpServer,
  options?: ConstructorParameters<typeof StreamableHTTPClientTransport>[1],
) {
  const client = new Client({
    name: 'http-transport-client',
    version: '1.0.0',
  })
  const transport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl), options)
  await client.connect(transport)
  return { client, transport }
}

async function closeHttpClient(client: {
  client: Client
  transport: StreamableHTTPClientTransport
}) {
  await Promise.allSettled([
    client.client.close().catch(() => undefined),
    client.transport.close().catch(() => undefined),
  ])
}

async function expectSessionNotFound(handle: StartedHttpServer, sessionId: string) {
  const response = await fetch(handle.mcpUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      'mcp-session-id': sessionId,
      'mcp-protocol-version': '2025-03-26',
    },
  })
  const payload = (await response.json()) as Record<string, unknown>

  expect(response.status).toBe(404)
  expect(payload).toMatchObject({
    error: {
      code: -32001,
      message: 'Session not found',
    },
  })
}

function expectConnectionClosedToolError(result: {
  isError?: boolean
  content?: { type: string; text: string }[]
}) {
  expect(result.isError).toBe(true)
  expect(result.content).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Connection closed'),
      }),
    ]),
  )
}

async function deleteSession(handle: StartedHttpServer, sessionId: string) {
  try {
    const response = await fetch(handle.mcpUrl, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        'mcp-session-id': sessionId,
        'mcp-protocol-version': '2025-03-26',
      },
    })

    const text = await response.text()
    const payload = text.length > 0 ? (JSON.parse(text) as Record<string, unknown>) : {}

    return { kind: 'response' as const, response, payload }
  } catch (error) {
    return { kind: 'network-error' as const, error }
  }
}

async function createReconnectHttpClient(handle: StartedHttpServer, sessionId: string) {
  const transport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl), {
    sessionId,
  })
  transport.setProtocolVersion('2025-03-26')

  const client = new Client({
    name: 'http-transport-client-reconnect',
    version: '1.0.0',
  })

  await client.connect(transport)
  return { client, transport }
}

async function sendAbortedPartialPost(handle: StartedHttpServer) {
  const url = new URL(handle.mcpUrl)
  const request = http.request({
    host: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    },
  })
  const requestSettled = new Promise<'close' | 'error'>((resolve) => {
    request.once('close', () => resolve('close'))
    request.once('error', () => resolve('error'))
  })

  request.write('{"jsonrpc":"2.0"')
  await waitFor(10)
  request.destroy()

  return await settleWithin(requestSettled, 'aborted partial request cleanup')
}

async function sendTruncatedContentLengthPost(handle: StartedHttpServer) {
  const url = new URL(handle.mcpUrl)
  const port = Number(url.port)
  const socket = net.createConnection({
    host: url.hostname,
    port,
  })
  const socketSettled = new Promise<'close' | 'error' | 'data'>((resolve) => {
    socket.once('data', () => {
      socket.destroy()
      resolve('data')
    })
    socket.once('error', () => resolve('error'))
    socket.once('close', () => resolve('close'))
  })

  await once(socket, 'connect')

  const body = '{"jsonrpc":"2.0",'
  const declaredLength = Buffer.byteLength(body, 'utf8') + 64
  socket.write(
    [
      `POST ${url.pathname} HTTP/1.1`,
      `Host: ${url.hostname}:${port}`,
      'Accept: application/json, text/event-stream',
      'Content-Type: application/json',
      `Content-Length: ${declaredLength}`,
      'Connection: close',
      '',
      body,
    ].join('\r\n'),
  )

  await waitFor(10)
  socket.end()

  return await settleWithin(socketSettled, 'truncated content-length request cleanup')
}

async function openSessionEventStream(handle: StartedHttpServer, sessionId: string) {
  const url = new URL(handle.mcpUrl)
  const request = http.request({
    host: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      'mcp-session-id': sessionId,
      'mcp-protocol-version': '2025-03-26',
    },
  })

  request.end()
  const [response] = (await once(request, 'response')) as [http.IncomingMessage]
  const settled = Promise.race([
    once(response, 'aborted').then(() => 'aborted' as const),
    once(response, 'close').then(() => 'close' as const),
    once(response, 'end').then(() => 'end' as const),
  ])

  response.resume()

  return { request, response, settled }
}

describe('http server transport', () => {
  it('exposes helper parsers for HTTP mode configuration', () => {
    expect(resolveHttpServerMode('raw')).toBe('raw')
    expect(resolveHttpServerMode('invalid')).toBeUndefined()
    expect(resolveHttpEnabledTags('project, application , project')).toEqual([
      'project',
      'application',
    ])
  })

  it('exposes a health endpoint and keeps default HTTP mode on codemode', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const response = await fetch(handle.healthUrl)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      ok: true,
      transport: 'http',
      mode: 'codemode',
      mcpPath: '/mcp',
      healthPath: '/health',
    })

    await withHttpClient(handle, async (client) => {
      const { tools } = await client.listTools()

      expect(tools.map((tool) => tool.name)).toEqual(['search', 'execute'])

      const result = await client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
      expect(result.structuredContent).toMatchObject({
        result: expect.any(Number),
        logs: [],
      })
    })
  })

  it('creates a reusable MCP session for HTTP clients', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    await withHttpClientTransport(handle, async (client, transport) => {
      expect(transport.sessionId).toEqual(expect.any(String))

      const firstSessionId = transport.sessionId
      const firstTools = await client.listTools()
      const secondTools = await client.listTools()

      expect(firstTools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
      expect(secondTools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
      expect(transport.sessionId).toBe(firstSessionId)
    })
  })

  it('supports HEAD health checks and rejects unsupported health methods', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const headResponse = await fetch(handle.healthUrl, { method: 'HEAD' })
    const postResponse = await fetch(handle.healthUrl, { method: 'POST' })
    const postPayload = (await postResponse.json()) as Record<string, unknown>

    expect(headResponse.status).toBe(200)
    expect(await headResponse.text()).toBe('')
    expect(postResponse.status).toBe(405)
    expect(postPayload).toEqual({ ok: false, error: 'Method not allowed' })
  })

  it('returns 404 for unknown routes', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(`${handle.url}/missing`)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(404)
    expect(payload).toEqual({ ok: false, error: 'Not found' })
  })

  it('rejects GET requests to /mcp without a session header', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32000,
        message: 'Bad Request: Mcp-Session-Id header is required',
      },
    })
  })

  it('rejects unknown MCP session IDs', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        'mcp-session-id': 'missing-session',
        'mcp-protocol-version': '2025-03-26',
      },
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({
      error: {
        code: -32001,
        message: 'Session not found',
      },
    })
  })

  it('rejects malformed JSON on POST /mcp', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
      body: '{"jsonrpc":"2.0",',
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
      },
    })
  })

  it('rejects structurally invalid JSON-RPC payloads on POST /mcp', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ hello: 'world' }),
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON-RPC message',
      },
    })
  })

  it('rejects POST /mcp without a session header after initialization-only flow', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
        params: {},
      }),
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32000,
        message: 'Bad Request: Mcp-Session-Id header is required',
      },
    })
  })

  it('rejects unsupported methods on /mcp', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/json, text/event-stream',
      },
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(405)
    expect(payload).toMatchObject({
      error: {
        code: -32603,
        message: 'Method not allowed',
      },
    })
  })

  it('supports explicit hybrid mode and tag filtering over HTTP', async () => {
    const handle = await startTestHttpServer({
      mode: 'hybrid',
      enabledTags: ['project'],
    })

    await withHttpClient(handle, async (client) => {
      const { tools } = await client.listTools()
      const names = tools.map((tool) => tool.name)

      expect(names).toContain('search')
      expect(names).toContain('execute')
      expect(names).toContain('project.one')
      expect(names).not.toContain('application.one')
    })
  })

  it('terminates sessions and rejects reuse after DELETE', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    await withHttpClientTransport(handle, async (_client, transport) => {
      const sessionId = transport.sessionId

      expect(sessionId).toEqual(expect.any(String))

      const response = await fetch(handle.mcpUrl, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          'mcp-session-id': sessionId!,
          'mcp-protocol-version': '2025-03-26',
        },
      })

      expect(response.status).toBe(200)
      await expectSessionNotFound(handle, sessionId!)
    })
  })

  it('keeps concurrent sessions isolated', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const first = await createConnectedHttpClient(handle)
    const second = await createConnectedHttpClient(handle)

    try {
      expect(first.transport.sessionId).toEqual(expect.any(String))
      expect(second.transport.sessionId).toEqual(expect.any(String))
      expect(first.transport.sessionId).not.toBe(second.transport.sessionId)

      await first.transport.terminateSession()
      expect(first.transport.sessionId).toBeUndefined()

      const tools = await second.client.listTools()
      expect(tools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])

      const result = await second.client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
    } finally {
      await Promise.allSettled([closeHttpClient(first), closeHttpClient(second)])
    }
  })

  it('supports reconnecting with an existing session id', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const initial = await createConnectedHttpClient(handle)

    const sessionId = initial.transport.sessionId

    expect(sessionId).toEqual(expect.any(String))

    await closeHttpClient(initial)
    const reconnect = await createReconnectHttpClient(handle, sessionId!)

    try {
      expect(reconnect.transport.sessionId).toBe(sessionId)

      const tools = await reconnect.client.listTools()
      expect(tools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])

      const result = await reconnect.client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
    } finally {
      await closeHttpClient(reconnect)
    }
  })

  it('does not leak sessions across repeated create and delete cycles', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const priorSessionIds = new Set<string>()

    for (let index = 0; index < 5; index += 1) {
      const client = await createConnectedHttpClient(handle)
      const sessionId = client.transport.sessionId

      expect(sessionId).toEqual(expect.any(String))
      expect(priorSessionIds.has(sessionId!)).toBe(false)
      priorSessionIds.add(sessionId!)

      await client.transport.terminateSession()
      expect(client.transport.sessionId).toBeUndefined()
      await expectSessionNotFound(handle, sessionId!)
      await closeHttpClient(client)
    }
  })

  it('keeps larger bursts of concurrent clients isolated under parallel calls', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const clients = await Promise.all(
      Array.from({ length: 12 }, () => createConnectedHttpClient(handle)),
    )

    try {
      const sessionIds = clients.map((client) => client.transport.sessionId)

      expect(sessionIds.every((sessionId) => typeof sessionId === 'string')).toBe(true)
      expect(new Set(sessionIds).size).toBe(clients.length)

      const results = await Promise.all(
        clients.map(async (client, index) => {
          const [tools, callResult] = await Promise.all([
            client.client.listTools(),
            client.client.callTool({
              name: 'search',
              arguments: {
                code: `catalog.getByTag("project").length + ${index}`,
              },
            }),
          ])

          return { tools, callResult }
        }),
      )

      for (const [index, result] of results.entries()) {
        expect(result.tools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
        expect(result.callResult.isError).not.toBe(true)
        expect(result.callResult.structuredContent).toMatchObject({
          result: expect.any(Number),
          logs: [],
        })
        expect((result.callResult.structuredContent as { result: number }).result >= index).toBe(
          true,
        )
      }

      await Promise.all(clients.slice(0, 6).map((client) => client.transport.terminateSession()))

      await Promise.all(
        clients
          .slice(0, 6)
          .map((client) => expectSessionNotFound(handle, client.transport.sessionId!)),
      )

      const survivingResults = await Promise.all(
        clients.slice(6).map((client) =>
          client.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          }),
        ),
      )

      for (const result of survivingResults) {
        expect(result.isError).not.toBe(true)
      }
    } finally {
      await Promise.allSettled(clients.map((client) => closeHttpClient(client)))
    }
  })

  it('supports reconnect handoff while the original client is still active', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const initial = await createConnectedHttpClient(handle)
    const sessionId = initial.transport.sessionId

    expect(sessionId).toEqual(expect.any(String))

    const reconnect = await createReconnectHttpClient(handle, sessionId!)

    try {
      const [initialTools, reconnectTools, initialCall, reconnectCall] = await Promise.all([
        initial.client.listTools(),
        reconnect.client.listTools(),
        initial.client.callTool({
          name: 'search',
          arguments: {
            code: 'catalog.getByTag("project").length',
          },
        }),
        reconnect.client.callTool({
          name: 'search',
          arguments: {
            code: 'catalog.getByTag("project").length + 1',
          },
        }),
      ])

      expect(initialTools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
      expect(reconnectTools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
      expect(initialCall.isError).not.toBe(true)
      expect(reconnectCall.isError).not.toBe(true)

      await closeHttpClient(initial)

      const reconnectAfterHandoff = await reconnect.client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(reconnectAfterHandoff.isError).not.toBe(true)

      await reconnect.transport.terminateSession()
      expect(reconnect.transport.sessionId).toBeUndefined()
      await expectSessionNotFound(handle, sessionId!)
    } finally {
      await Promise.allSettled([closeHttpClient(initial), closeHttpClient(reconnect)])
    }
  })

  it('survives longer repeated create reconnect and terminate pressure', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const priorSessionIds = new Set<string>()

    for (let index = 0; index < 20; index += 1) {
      const client = await createConnectedHttpClient(handle)
      const sessionId = client.transport.sessionId

      expect(sessionId).toEqual(expect.any(String))
      expect(priorSessionIds.has(sessionId!)).toBe(false)
      priorSessionIds.add(sessionId!)

      const reconnect = await createReconnectHttpClient(handle, sessionId!)

      try {
        const [primaryResult, reconnectResult] = await Promise.all([
          client.client.callTool({
            name: 'search',
            arguments: {
              code: `catalog.getByTag("project").length + ${index}`,
            },
          }),
          reconnect.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          }),
        ])

        expect(primaryResult.isError).not.toBe(true)
        expect(reconnectResult.isError).not.toBe(true)

        if (index % 2 === 0) {
          await closeHttpClient(client)

          const reconnectOnlyResult = await reconnect.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          })

          expect(reconnectOnlyResult.isError).not.toBe(true)
        }

        await reconnect.transport.terminateSession()
        expect(reconnect.transport.sessionId).toBeUndefined()
        await expectSessionNotFound(handle, sessionId!)
      } finally {
        await Promise.allSettled([closeHttpClient(client), closeHttpClient(reconnect)])
      }
    }
  })

  it('applies managed shutdown semantics when callers use createHttpServer directly', async () => {
    const handle = await startCreatedTestHttpServer({ mode: 'codemode' })
    const client = await createConnectedHttpClient(handle)

    try {
      const pendingCall = client.client.callTool({
        name: 'execute',
        arguments: {
          code: buildSleepExecuteCode(150, 'direct-create-http-server-close'),
        },
      })
      const partialRequest = sendAbortedPartialPost(handle)

      await waitFor(20)

      const closeResults = await settleWithin(
        Promise.all(
          Array.from(
            { length: 4 },
            () =>
              new Promise<void>((resolve, reject) => {
                handle.server.close((error) => {
                  if (error) {
                    reject(error)
                    return
                  }

                  resolve()
                })
              }),
          ),
        ),
        'direct createHttpServer close callers',
        4_000,
      )
      const result = await settleWithin(pendingCall, 'direct createHttpServer active call', 4_000)
      const partialResult = await partialRequest

      expect(closeResults).toHaveLength(4)
      expect(['close', 'error']).toContain(partialResult)

      if (result.isError) {
        expectConnectionClosedToolError(result)
      } else {
        expect(result.structuredContent).toMatchObject({
          result: {
            label: 'direct-create-http-server-close',
            slept: 150,
          },
        })
      }
    } finally {
      await closeHttpClient(client)
    }
  })

  it('stays healthy under reconnect stress mixed with malformed and aborted request bursts', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const primaryClients = await Promise.all(
      Array.from({ length: 6 }, () => createConnectedHttpClient(handle)),
    )
    const reconnectClients = await Promise.all(
      primaryClients.map((client) =>
        createReconnectHttpClient(handle, client.transport.sessionId!),
      ),
    )

    try {
      const validOperations = [...primaryClients, ...reconnectClients].map((client, index) =>
        client.client.callTool({
          name: 'search',
          arguments: {
            code: `catalog.getByTag("project").length + ${index}`,
          },
        }),
      )

      const malformedRequests = Array.from({ length: 6 }, () =>
        fetch(handle.mcpUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
          },
          body: '{"jsonrpc":"2.0",',
        }).then(async (response) => ({
          status: response.status,
          payload: (await response.json()) as Record<string, unknown>,
        })),
      )

      const invalidRequests = Array.from({ length: 6 }, () =>
        fetch(handle.mcpUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ invalid: true }),
        }).then(async (response) => ({
          status: response.status,
          payload: (await response.json()) as Record<string, unknown>,
        })),
      )

      const abortedRequests = Array.from({ length: 6 }, () => sendAbortedPartialPost(handle))

      const [validResults, malformedResults, invalidResults, abortedResults] = await Promise.all([
        Promise.all(validOperations),
        Promise.all(malformedRequests),
        Promise.all(invalidRequests),
        Promise.all(abortedRequests),
      ])

      for (const result of validResults) {
        expect(result.isError).not.toBe(true)
      }

      for (const result of malformedResults) {
        expect(result.status).toBe(400)
        expect(result.payload).toMatchObject({
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON',
          },
        })
      }

      for (const result of invalidResults) {
        expect(result.status).toBe(400)
        expect(result.payload).toMatchObject({
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON-RPC message',
          },
        })
      }

      for (const result of abortedResults) {
        expect(['close', 'error']).toContain(result)
      }

      await Promise.all(primaryClients.slice(0, 3).map((client) => closeHttpClient(client)))

      const reconnectAfterBurstResults = await Promise.all(
        reconnectClients.map((client, index) =>
          client.client.callTool({
            name: 'search',
            arguments: {
              code: `catalog.getByTag("project").length + ${index}`,
            },
          }),
        ),
      )

      for (const result of reconnectAfterBurstResults) {
        expect(result.isError).not.toBe(true)
      }
    } finally {
      await Promise.allSettled([
        ...primaryClients.map((client) => closeHttpClient(client)),
        ...reconnectClients.map((client) => closeHttpClient(client)),
      ])
    }
  })

  it('stays healthy under reconnect-only mixed fault bursts including truncated bodies', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const primaryClients = await Promise.all(
      Array.from({ length: 8 }, () => createConnectedHttpClient(handle)),
    )
    const reconnectClients = await Promise.all(
      primaryClients.map((client) =>
        createReconnectHttpClient(handle, client.transport.sessionId!),
      ),
    )

    try {
      await Promise.all(primaryClients.slice(0, 4).map((client) => closeHttpClient(client)))

      const activeClients = [...primaryClients.slice(4), ...reconnectClients]
      const validOperations = activeClients.map(async (client, index) => {
        const [tools, callResult] = await Promise.all([
          client.client.listTools(),
          client.client.callTool({
            name: 'search',
            arguments: {
              code: `catalog.getByTag("project").length + ${index}`,
            },
          }),
        ])

        return { tools, callResult }
      })
      const malformedRequests = Array.from({ length: 8 }, () =>
        fetch(handle.mcpUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
          },
          body: '{"jsonrpc":"2.0",',
        }).then(async (response) => ({
          status: response.status,
          payload: (await response.json()) as Record<string, unknown>,
        })),
      )
      const invalidRequests = Array.from({ length: 8 }, () =>
        fetch(handle.mcpUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ invalid: true }),
        }).then(async (response) => ({
          status: response.status,
          payload: (await response.json()) as Record<string, unknown>,
        })),
      )
      const abortedRequests = Array.from({ length: 8 }, () => sendAbortedPartialPost(handle))
      const truncatedRequests = Array.from({ length: 8 }, () =>
        sendTruncatedContentLengthPost(handle),
      )

      const [validResults, malformedResults, invalidResults, abortedResults, truncatedResults] =
        await Promise.all([
          Promise.all(validOperations),
          Promise.all(malformedRequests),
          Promise.all(invalidRequests),
          Promise.all(abortedRequests),
          Promise.all(truncatedRequests),
        ])

      for (const result of validResults) {
        expect(result.tools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
        expect(result.callResult.isError).not.toBe(true)
      }

      for (const result of malformedResults) {
        expect(result.status).toBe(400)
        expect(result.payload).toMatchObject({
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON',
          },
        })
      }

      for (const result of invalidResults) {
        expect(result.status).toBe(400)
        expect(result.payload).toMatchObject({
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON-RPC message',
          },
        })
      }

      for (const result of abortedResults) {
        expect(['close', 'error']).toContain(result)
      }

      for (const result of truncatedResults) {
        expect(['close', 'error', 'data']).toContain(result)
      }

      const reconnectAfterBurstResults = await Promise.all(
        reconnectClients.map((client, index) =>
          client.client.callTool({
            name: 'search',
            arguments: {
              code: `catalog.getByTag("project").length + ${index}`,
            },
          }),
        ),
      )

      for (const result of reconnectAfterBurstResults) {
        expect(result.isError).not.toBe(true)
      }
    } finally {
      await Promise.allSettled([
        ...primaryClients.map((client) => closeHttpClient(client)),
        ...reconnectClients.map((client) => closeHttpClient(client)),
      ])
    }
  })

  it('lets active requests finish cleanly while server shutdown is in progress', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const client = await createConnectedHttpClient(handle)

    try {
      const pendingCall = client.client.callTool({
        name: 'execute',
        arguments: {
          code: buildSleepExecuteCode(150, 'shutdown-drain-complete'),
        },
      })

      await waitFor(20)

      const closePromise = settleWithin(handle.close(), 'shutdown drain close', 4_000)
      const result = await settleWithin(pendingCall, 'shutdown drain active call', 4_000)

      if (result.isError) {
        expectConnectionClosedToolError(result)
      } else {
        expect(result.structuredContent).toMatchObject({
          result: {
            label: 'shutdown-drain-complete',
            slept: 150,
          },
        })
      }

      await closePromise
    } finally {
      await closeHttpClient(client)
    }
  })

  it('does not hang when session deletion races with shutdown during an active request', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const client = await createConnectedHttpClient(handle)
    const sessionId = client.transport.sessionId!

    try {
      const pendingCall = client.client.callTool({
        name: 'execute',
        arguments: {
          code: buildSleepExecuteCode(150, 'race-finished'),
        },
      })

      await waitFor(20)

      const [deleteResult, closeResult, callResult] = await Promise.all([
        settleWithin(deleteSession(handle, sessionId), 'shutdown race delete'),
        settleWithin(handle.close(), 'shutdown race close'),
        settleWithin(pendingCall, 'shutdown race active call', 4_000),
      ])

      if (deleteResult.kind === 'response') {
        expect([200, 404, 503]).toContain(deleteResult.response.status)
      } else {
        expect(deleteResult.error).toBeInstanceOf(Error)
      }

      if (callResult.isError) {
        expectConnectionClosedToolError(callResult)
      } else {
        expect(callResult.structuredContent).toMatchObject({
          result: {
            label: 'race-finished',
            slept: 150,
          },
        })
      }
      expect(closeResult).toBeUndefined()
    } finally {
      await closeHttpClient(client)
    }
  })

  it('does not hang shutdown on a request with an unfinished body', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const url = new URL(handle.mcpUrl)
    const request = http.request({
      host: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
    })
    const requestSettled = new Promise<'close' | 'error'>((resolve) => {
      request.once('close', () => resolve('close'))
      request.once('error', () => resolve('error'))
    })
    const [socket] = (await once(request, 'socket')) as [http.ClientRequest['socket']]

    if (socket && 'connecting' in socket && socket.connecting) {
      await once(socket, 'connect')
    }

    request.write('{"jsonrpc":"2.0"')
    await waitFor(20)

    await settleWithin(handle.close(), 'HTTP shutdown with unfinished request body')
    await settleWithin(requestSettled, 'unfinished request cleanup')
  })

  it('closes active SSE streams during shutdown without hanging', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const initial = await createConnectedHttpClient(handle)
    const sessionId = initial.transport.sessionId

    expect(sessionId).toEqual(expect.any(String))
    await closeHttpClient(initial)

    const url = new URL(handle.mcpUrl)
    const request = http.request({
      host: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'mcp-session-id': sessionId!,
        'mcp-protocol-version': '2025-03-26',
      },
    })

    request.end()
    const [response] = (await once(request, 'response')) as [http.IncomingMessage]
    const streamSettled = Promise.race([
      once(response, 'aborted'),
      once(response, 'close'),
      once(response, 'end'),
    ])
    response.resume()

    expect([200, 409]).toContain(response.statusCode)
    if (response.statusCode === 200) {
      expect(response.headers['content-type']).toContain('text/event-stream')
    }

    await settleWithin(handle.close(), 'HTTP shutdown with active SSE stream')
    await settleWithin(streamSettled, 'active SSE cleanup')
  })

  it('closes active shared-session streams cleanly when duplicate deletes race with unrelated traffic', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const victim = await createConnectedHttpClient(handle)
    const survivor = await createConnectedHttpClient(handle)
    const sessionId = victim.transport.sessionId!
    await closeHttpClient(victim)
    const stream = await openSessionEventStream(handle, sessionId)

    try {
      expect(stream.response.statusCode).toBe(200)
      expect(stream.response.headers['content-type']).toContain('text/event-stream')

      const [firstDelete, secondDelete, streamResult, survivorResult] = await Promise.all([
        settleWithin(deleteSession(handle, sessionId), 'duplicate delete first'),
        settleWithin(deleteSession(handle, sessionId), 'duplicate delete second'),
        settleWithin(stream.settled, 'duplicate delete stream cleanup', 4_000),
        settleWithin(
          survivor.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          }),
          'duplicate delete survivor call',
          4_000,
        ),
      ])

      for (const result of [firstDelete, secondDelete]) {
        if (result.kind === 'response') {
          expect([200, 404, 503]).toContain(result.response.status)
        } else {
          expect(result.error).toBeInstanceOf(Error)
        }
      }

      expect(['aborted', 'close', 'end']).toContain(streamResult)

      expect(survivorResult.isError).not.toBe(true)
      await expectSessionNotFound(handle, sessionId)
    } finally {
      await Promise.allSettled([closeHttpClient(victim), closeHttpClient(survivor)])
    }
  })

  it('settles mixed termination ordering under concurrency during shutdown', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const clients = await Promise.all(
      Array.from({ length: 8 }, () => createConnectedHttpClient(handle)),
    )

    try {
      const operations = [
        ...clients.slice(0, 2).map((client) => client.transport.terminateSession()),
        ...clients.slice(2, 4).map((client) => deleteSession(handle, client.transport.sessionId!)),
        ...clients.slice(4).map((client, index) =>
          client.client
            .callTool({
              name: 'search',
              arguments: {
                code: `catalog.getByTag("project").length + ${index}`,
              },
            })
            .then((result) => ({ kind: 'tool-result' as const, result }))
            .catch((error) => ({ kind: 'tool-error' as const, error })),
        ),
      ]

      const settled = await settleWithin(
        Promise.allSettled([...operations, handle.close()]),
        'mixed termination ordering shutdown',
        6_000,
      )

      const shutdownResult = settled.at(-1)
      const deleteResults = settled.slice(2, 4)

      expect(shutdownResult?.status).toBe('fulfilled')

      for (const result of deleteResults) {
        expect(result.status).toBe('fulfilled')
        if (result.status !== 'fulfilled') {
          continue
        }

        if (result.value.kind === 'response') {
          expect([200, 404, 503]).toContain(result.value.response.status)
        } else {
          expect(result.value.error).toBeInstanceOf(Error)
        }
      }
    } finally {
      await Promise.allSettled(clients.map((client) => closeHttpClient(client)))
    }
  })
})
